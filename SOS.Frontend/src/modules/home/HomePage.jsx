// src/modules/home/HomePage.jsx
import React, { useEffect, useState, useRef } from "react"; // Thêm useRef
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal"; // Import Modal (Giả sử bạn dùng chung component Modal)
import "./HomePage.css";

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // State cho Header (Chọn tỉnh)
  const [provinces, setProvinces] = useState([]);
  const [currentProvince, setCurrentProvince] = useState(null);
  const [showLocaDropdown, setShowLocaDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- STATE CHO FORM TẠO YÊU CẦU ---
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqType, setReqType] = useState("Cần lương thực");
  const [reqDesc, setReqDesc] = useState("");
  const [reqAddress, setReqAddress] = useState(""); // Địa chỉ trong form yêu cầu
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading khi gửi form

  // --- STATE CHO GỢI Ý ĐỊA CHỈ (AUTOCOMPLETE) ---
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // --- 1. SETUP DỮ LIỆU BAN ĐẦU ---
  useEffect(() => {
    // Lấy danh sách tỉnh thành cho Header
    const fetchApiProvinces = async () => {
      try {
        const res = await fetch(
          "https://provinces.open-api.vn/api/v2/?depth=1"
        );
        const data = await res.json();
        setProvinces(data);
      } catch (error) {
        console.error("Lỗi API Tỉnh thành: ", error);
      }
    };
    fetchApiProvinces();
  }, []);

  useEffect(() => {
    // Lấy user từ localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Khi mở form yêu cầu, điền sẵn địa chỉ của user
  useEffect(() => {
    if (showRequestForm && user) {
      setReqAddress(user.address || "");
    }
  }, [showRequestForm, user]);

  // Click outside để đóng gợi ý
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

  // --- 2. LOGIC AUTOCOMPLETE (GIỐNG MAP PAGE) ---
  const filterUniqueSuggestions = (data) => {
    const seen = new Set();
    return data.filter((item) => {
      const duplicate = seen.has(item.display_name);
      seen.add(item.display_name);
      return !duplicate;
    });
  };

  const handleAddressInputChange = (e) => {
    const value = e.target.value;
    setReqAddress(value);

    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            value
          )}&addressdetails=1&limit=5&countrycodes=vn`
        );
        const data = await res.json();
        const uniqueData = filterUniqueSuggestions(data);
        setSuggestions(uniqueData);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Lỗi lấy gợi ý:", error);
      }
    }, 500);
  };

  const handleSelectSuggestion = (item) => {
    setReqAddress(item.display_name);
    setShowSuggestions(false);
  };

  // --- 3. XỬ LÝ GỬI YÊU CẦU (CÓ CHECK TỌA ĐỘ) ---
  const handleCreateRequest = async () => {
    if (!user) {
      alert("Vui lòng đăng nhập để gửi yêu cầu.");
      return;
    }
    if (!reqAddress.trim()) {
      alert("Vui lòng nhập địa chỉ hiện tại của bạn.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Gọi API để lấy tọa độ mới nhất của địa chỉ trong form
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          reqAddress
        )}&limit=1`
      );
      const data = await res.json();

      let finalLocation = user.location; // Mặc định dùng vị trí cũ
      let finalAddress = reqAddress;

      if (data && data.length > 0) {
        // Nếu tìm thấy tọa độ mới từ địa chỉ nhập vào -> Dùng tọa độ mới
        finalLocation = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        finalAddress = data[0].display_name; // Chuẩn hóa tên địa chỉ
      } else {
        // Nếu không tìm thấy, cảnh báo nhưng vẫn cho gửi (hoặc chặn tùy logic của bạn)
        // Ở đây ta cảnh báo nhẹ nhưng vẫn dùng địa chỉ text user nhập
        const confirmUseOld = window.confirm(
          "⚠️ Không tìm thấy tọa độ chính xác cho địa chỉ này trên bản đồ.\n\nBạn có muốn tiếp tục gửi với vị trí định vị cũ không?"
        );
        if (!confirmUseOld) {
          setIsSubmitting(false);
          return;
        }
      }

      // Tạo object Request
      const requests =
        JSON.parse(localStorage.getItem("RELIEF_REQUESTS")) || [];
      const newRequest = {
        id: Date.now(),
        userId: user.phone,
        name: user.name,
        phone: user.phone,
        address: finalAddress, // Dùng địa chỉ mới
        location: finalLocation, // Dùng tọa độ mới
        type: reqType,
        description: reqDesc,
        status: "pending",
        timestamp: new Date().toLocaleString(),
      };

      const updatedRequests = [...requests, newRequest];
      localStorage.setItem("RELIEF_REQUESTS", JSON.stringify(updatedRequests));

      alert("✅ Đã gửi yêu cầu thành công! Vui lòng chờ Admin duyệt.");
      setShowRequestForm(false);
      setReqDesc("");
      // Không reset reqAddress để lần sau mở lên vẫn thấy
    } catch (error) {
      console.error("Lỗi gửi yêu cầu:", error);
      alert("Có lỗi xảy ra khi xử lý địa chỉ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 4. XỬ LÝ HEADER & LOGOUT ---
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleChooseProvince = async (province) => {
    setCurrentProvince(province);
    setShowLocaDropdown(false);
    setIsLoading(true);
    try {
      const query = `${province.name}, Việt Nam`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          query
        )}&format=json&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        navigate("/map", {
          state: {
            position: [lat, lon],
            name: province.name,
          },
        });
      } else {
        navigate("/map", { state: { name: province.name } });
      }
    } catch (error) {
      console.error("Lỗi ngầm định vị:", error);
      navigate("/map");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="homepage">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div className="loading-text">Đang định vị...</div>
        </div>
      )}

      {/* HEADER */}
      <header className="site-header">
        <div className="logo-area">
          <div className="logo-group" onClick={() => navigate("/home")}>
            <span className="logo-icon">🚨</span>
            <span className="logo-text">Cứu Hộ</span>
          </div>

          <div className="box-location">
            <div
              className="location-badge"
              onClick={() => setShowLocaDropdown(!showLocaDropdown)}
            >
              {currentProvince ? currentProvince.name : "Chọn tỉnh"} ▾
            </div>

            {showLocaDropdown && (
              <div className="lst-provinces-drop">
                {provinces.length > 0 ? (
                  provinces.map((prov) => (
                    <div
                      key={prov.code}
                      onClick={() => handleChooseProvince(prov)}
                      className="imt-provinces"
                    >
                      {prov.name}
                    </div>
                  ))
                ) : (
                  <div className="imt-provinces">Đang tải dữ liệu...</div>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className="main-nav">
          <a href="#" className="active">
            Trang chủ
          </a>
          <a onClick={() => navigate("/map")}>Bản đồ</a>
          <a onClick={() => navigate("/about")}>Liên hệ</a>

          {user ? (
            <div
              className="user-profile"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <span className="user-name">
                Xin chào, <strong>{user.name}</strong> ▾
              </span>
              {showDropdown && (
                <div className="dropdown-menu">
                  <div className="dropdown-item" onClick={handleLogout}>
                    Đăng xuất
                  </div>
                </div>
              )}
            </div>
          ) : (
            <a href="/" style={{ color: "#007bff" }}>
              Đăng nhập
            </a>
          )}
        </nav>
      </header>

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-content--text">
            <h1>Thông Tin Cứu Hộ</h1>
            <p>
              Dự án cộng đồng nhằm thu thập và trực quan hóa thông tin liên quan
              đến cứu trợ, cứu nạn trong các trận thiên tai. Chúng tôi mong muốn
              mang đến cho cộng đồng một cái nhìn trực quan và kịp thời.
            </p>
            <div className="lst-btn-hp">
              <button className="btn-hero" onClick={() => navigate("/map")}>
                Xem Bản Đồ
              </button>
              {/* Chỉ hiện nút Gửi yêu cầu nếu là Rescuee */}
              {user?.role === "rescuee" && (
                <button
                  className="btn-request"
                  onClick={() => setShowRequestForm(true)}
                >
                  Gửi yêu cầu hỗ trợ
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-bottom">
          <span>© 2025 Cứu Hộ App</span>
          <span>|</span>
          <button onClick={() => window.scrollTo(0, 0)}>Trang chủ</button>
          <span>|</span>
          <button onClick={() => navigate("/map")}>Bản đồ</button>
        </div>
      </footer>

      {/* --- MODAL GỬI YÊU CẦU --- */}
      {showRequestForm && (
        <Modal
          title="Gửi yêu cầu khẩn cấp"
          onClose={() => setShowRequestForm(false)}
        >
          <div className="form-group">
            <label>Bạn cần giúp gì?</label>
            <select
              value={reqType}
              onChange={(e) => setReqType(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ddd",
              }}
            >
              <option>Cần lương thực</option>
              <option>Cần thuốc men / Y tế</option>
              <option>Cần sơ tán khẩn cấp</option>
              <option>Cần áo phao / Thuyền</option>
              <option>Khác</option>
            </select>
          </div>

          {/* Ô NHẬP ĐỊA CHỈ CÓ AUTOCOMPLETE */}
          <div className="form-group" ref={wrapperRef}>
            <label>
              Địa chỉ hiện tại <span style={{ color: "red" }}>*</span>
            </label>
            <div className="address-input-container">
              <input
                type="text"
                placeholder="Nhập địa chỉ bạn đang ở..."
                value={reqAddress}
                onChange={handleAddressInputChange}
                onFocus={() => reqAddress && setShowSuggestions(true)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #007bff",
                }}
                autoComplete="off"
              />
              <small
                style={{ color: "#666", fontSize: "0.85rem", marginTop: "5px" }}
              >
                📍 Hệ thống sẽ định vị lại theo địa chỉ này.
              </small>

              {/* POPUP GỢI Ý */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="suggestions-dropdown">
                  {suggestions.map((item, index) => (
                    <div
                      key={index}
                      className="suggestion-item"
                      onClick={() => handleSelectSuggestion(item)}
                    >
                      <span style={{ fontSize: "1.2rem" }}>📍</span>
                      <span className="suggestion-text">
                        {item.display_name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Mô tả chi tiết</label>
            <textarea
              rows="4"
              placeholder="Mô tả tình trạng (số người, mức nước...)..."
              value={reqDesc}
              onChange={(e) => setReqDesc(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ddd",
              }}
            />
          </div>

          <button
            className="btn-primary"
            style={{ backgroundColor: "#dc2626", marginTop: "10px" }}
            onClick={handleCreateRequest}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang xử lý..." : "Gửi Yêu Cầu"}
          </button>
        </Modal>
      )}
    </div>
  );
};

export default HomePage;
