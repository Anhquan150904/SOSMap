import React, { useState, useRef, useEffect } from "react";
import Modal from "../../components/Modal"; // Đảm bảo đường dẫn đúng
import "./RegisterForm.css"; // Nhớ import file CSS

const RegisterForm = ({ phoneNumber, onClose, onRegister }) => {
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  // --- STATE CHO GỢI Ý ---
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null); // Để xử lý click ra ngoài

  // --- HÀM LỌC TRÙNG LẶP (QUAN TRỌNG) ---
  const filterUniqueSuggestions = (data) => {
    const seen = new Set();
    return data.filter((item) => {
      const duplicate = seen.has(item.display_name);
      seen.add(item.display_name);
      return !duplicate;
    });
  };

  // --- HÀM XỬ LÝ KHI NHẬP LIỆU (CÓ DEBOUNCE) ---
  const handleAddressChange = (e) => {
    const value = e.target.value;
    setAddress(value);

    // Nếu xóa hết thì ẩn gợi ý
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear timeout cũ để tránh gọi API liên tục
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        // Thêm countrycodes=vn để ưu tiên Việt Nam, limit=10 để lấy nhiều rồi lọc
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            value
          )}&addressdetails=1&limit=10&countrycodes=vn`
        );
        const data = await res.json();

        // Lọc trùng lặp trước khi set state
        const uniqueData = filterUniqueSuggestions(data);

        setSuggestions(uniqueData);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Lỗi lấy gợi ý:", error);
      }
    }, 200);
  };

  // --- KHI CHỌN GỢI Ý ---
  const handleSelectSuggestion = (item) => {
    setAddress(item.display_name);
    setShowSuggestions(false);
  };

  // --- LOGIC GỐC: NÚT XÁC THỰC ---
  const handleSubmit = async () => {
    if (!fullName || !address) {
      alert("Vui lòng điền đầy đủ: Họ tên và Địa chỉ!");
      return;
    }

    setIsChecking(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];

        onRegister({
          fullName,
          phoneNumber,
          address: data[0].display_name,
          location: coords,
        });
      } else {
        alert(
          "❌ Không tìm thấy địa chỉ này trên bản đồ!\n\nGợi ý: Hãy nhập chi tiết hơn (Số nhà, Đường, Quận/Huyện, Tỉnh/Thành)."
        );
      }
    } catch (error) {
      console.error("Lỗi mạng:", error);
      alert("Lỗi kết nối bản đồ. Vui lòng thử lại.");
    } finally {
      setIsChecking(false);
    }
  };

  // Ẩn popup khi click ra ngoài vùng gợi ý
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  return (
    <Modal title="Hoàn tất đăng ký" onClose={onClose}>
      <p>Số điện thoại chưa tồn tại. Vui lòng điền thông tin.</p>

      <div className="form-group">
        <label>Số điện thoại</label>
        <input
          type="text"
          value={phoneNumber}
          readOnly
          style={{ background: "#f3f4f6", color: "#888" }}
        />
      </div>

      <div className="form-group">
        <label>Họ và tên</label>
        <input
          type="text"
          placeholder="Nguyễn Văn A"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <div className="form-group" ref={wrapperRef}>
        <label>
          Địa chỉ chính xác <span style={{ color: "red" }}>*</span>
        </label>

        {/* Container bọc ô input và dropdown */}
        <div className="address-input-container">
          <input
            type="text"
            placeholder="Nhập địa chỉ để tìm kiếm..."
            value={address}
            onChange={handleAddressChange}
            onFocus={() =>
              address && setSuggestions(suggestions) && setShowSuggestions(true)
            }
            style={{ border: "1px solid #007bff" }}
            autoComplete="off"
          />

          {/* Danh sách gợi ý */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((item, index) => (
                <div
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleSelectSuggestion(item)}
                >
                  <span style={{ fontSize: "1.2rem" }}>📍</span>
                  <span className="suggestion-text">{item.display_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <small
          style={{
            color: "#d9534f",
            fontSize: "0.85rem",
            marginTop: "5px",
            display: "block",
          }}
        >
          ⚠️ Hệ thống sẽ dùng địa chỉ này để định vị bạn trên bản đồ.
        </small>
      </div>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={isChecking}
      >
        {isChecking ? "Đang kiểm tra vị trí..." : "Xác thực & Đăng ký"}
      </button>
    </Modal>
  );
};

export default RegisterForm;
