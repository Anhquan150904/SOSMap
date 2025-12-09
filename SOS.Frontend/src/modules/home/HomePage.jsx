// src/modules/home/HomePage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal";
import "./HomePage.css";

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);

  // State Header (Chọn tỉnh)
  const [provinces, setProvinces] = useState([]);
  const [currentProvince, setCurrentProvince] = useState(null);
  const [showLocaDropdown, setShowLocaDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- STATE CHO FORM TẠO YÊU CẦU SOS ---
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqType, setReqType] = useState("Cần lương thực");
  const [reqDesc, setReqDesc] = useState("");
  const [reqAddress, setReqAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATE QUẢN LÝ ĐIỂM CỨU TRỢ ---
  const [reliefPoints, setReliefPoints] = useState([]);
  const [showAddPointModal, setShowAddPointModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null); // Để biết đang sửa hay thêm

  // State form nhập liệu điểm cứu trợ
  const [newPointName, setNewPointName] = useState("");
  const [newPointAddress, setNewPointAddress] = useState("");
  const [newPointType, setNewPointType] = useState("Thực phẩm, Nước sạch");
  const [newPointStatus, setNewPointStatus] = useState("Đang hoạt động");

  // State Autocomplete
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeAutocomplete, setActiveAutocomplete] = useState(null);

  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  const pointWrapperRef = useRef(null);

  // Dữ liệu mẫu
  const initialReliefPoints = [
    {
      id: 1,
      name: "UBND Phường Yên Hòa",
      address: "Số 282 Trung Kính, Cầu Giấy, Hà Nội",
      type: "Thực phẩm, Nước sạch",
      status: "Đang hoạt động",
    },
    {
      id: 2,
      name: "Nhà Văn hóa Quận Thanh Xuân",
      address: "166 Khuất Duy Tiến, Thanh Xuân, Hà Nội",
      type: "Thuốc men, Y tế",
      status: "Đang hoạt động",
    },
    {
      id: 3,
      name: "Trường THPT Chu Văn An",
      address: "10 Thụy Khuê, Tây Hồ, Hà Nội",
      type: "Chỗ ở tạm thời",
      status: "Đầy chỗ",
    },
    {
      id: 4,
      name: "Trạm Y tế Phường Láng Hạ",
      address: "105 Láng Hạ, Đống Đa, Hà Nội",
      type: "Sơ cấp cứu",
      status: "Đang hoạt động",
    },
    {
      id: 5,
      name: "Chùa Bằng (Linh Tiên Tự)",
      address: "63 Bằng Liệt, Hoàng Mai, Hà Nội",
      type: "Cơm từ thiện",
      status: "Đang hoạt động",
    },
  ];

  // --- 1. LOAD DỮ LIỆU ---
  useEffect(() => {
    const sessionUserStr = localStorage.getItem("currentUser");
    if (sessionUserStr) {
      let currentUser = JSON.parse(sessionUserStr);
      const userDB = JSON.parse(localStorage.getItem("USER_DATABASE") || "{}");
      const officialKey = `${currentUser.phone}_volunteer`;

      if (userDB[officialKey] && currentUser.role === "volunteer-pending") {
        localStorage.setItem(
          "currentUser",
          JSON.stringify(userDB[officialKey])
        );
        currentUser = userDB[officialKey];
      }
      setUser(currentUser);

      const allNotis = JSON.parse(
        localStorage.getItem("SYSTEM_NOTIFICATIONS") || "[]"
      );
      const myNotis = allNotis
        .filter((n) => {
          const isMyPhone = String(n.to) === String(currentUser.phone);
          const isMyRole = n.targetRole
            ? n.targetRole === currentUser.role
            : true;
          return isMyPhone && isMyRole;
        })
        .reverse();
      setNotifications(myNotis);
    }

    const storedPoints = localStorage.getItem("RELIEF_POINTS");
    if (storedPoints) {
      setReliefPoints(JSON.parse(storedPoints));
    } else {
      setReliefPoints(initialReliefPoints);
      localStorage.setItem(
        "RELIEF_POINTS",
        JSON.stringify(initialReliefPoints)
      );
    }
  }, []);

  // --- 2. LOAD PROVINCES ---
  useEffect(() => {
    const fetchApiProvinces = async () => {
      try {
        const res = await fetch(
          "https://provinces.open-api.vn/api/v2/?depth=1"
        );
        const data = await res.json();
        setProvinces(data);
      } catch (error) {
        console.error("Lỗi API: ", error);
      }
    };
    fetchApiProvinces();
  }, []);

  useEffect(() => {
    if (showRequestForm && user) {
      setReqAddress(user.address || "");
    }
  }, [showRequestForm, user]);

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedInsideSOS =
        wrapperRef.current && wrapperRef.current.contains(event.target);
      const clickedInsidePoint =
        pointWrapperRef.current &&
        pointWrapperRef.current.contains(event.target);

      if (!clickedInsideSOS && !clickedInsidePoint) {
        setShowSuggestions(false);
        setActiveAutocomplete(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, pointWrapperRef]);

  // --- 3. LOGIC AUTOCOMPLETE ---
  const filterUniqueSuggestions = (data) => {
    const seen = new Set();
    return data.filter((item) => {
      const duplicate = seen.has(item.display_name);
      seen.add(item.display_name);
      return !duplicate;
    });
  };

  const fetchSuggestions = (query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&addressdetails=1&limit=5&countrycodes=vn`
        );
        const data = await res.json();
        const uniqueData = filterUniqueSuggestions(data);
        setSuggestions(uniqueData);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Lỗi gợi ý:", error);
      }
    }, 500);
  };

  const handleReqAddressChange = (e) => {
    const value = e.target.value;
    setReqAddress(value);
    setActiveAutocomplete("sos");
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    fetchSuggestions(value);
  };

  const handlePointAddressChange = (e) => {
    const value = e.target.value;
    setNewPointAddress(value);
    setActiveAutocomplete("point");
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    fetchSuggestions(value);
  };

  const handleSelectSuggestion = (item) => {
    if (activeAutocomplete === "sos") setReqAddress(item.display_name);
    else if (activeAutocomplete === "point")
      setNewPointAddress(item.display_name);
    setShowSuggestions(false);
    setActiveAutocomplete(null);
  };

  // --- 4. CRUD ĐIỂM CỨU TRỢ ---
  const resetPointForm = () => {
    setNewPointName("");
    setNewPointAddress("");
    setNewPointType("Thực phẩm, Nước sạch");
    setNewPointStatus("Đang hoạt động");
    setEditingPoint(null);
  };

  const openAddModal = () => {
    resetPointForm();
    setShowAddPointModal(true);
  };

  const openEditModal = (point) => {
    setEditingPoint(point);
    setNewPointName(point.name);
    setNewPointAddress(point.address);
    setNewPointType(point.type);
    setNewPointStatus(point.status);
    setShowAddPointModal(true);
  };

  const handleSavePoint = () => {
    if (!newPointName || !newPointAddress) {
      alert("Vui lòng nhập tên và địa chỉ!");
      return;
    }

    let updatedPoints;
    if (editingPoint) {
      updatedPoints = reliefPoints.map((p) =>
        p.id === editingPoint.id
          ? {
              ...p,
              name: newPointName,
              address: newPointAddress,
              type: newPointType,
              status: newPointStatus,
            }
          : p
      );
      alert("Đã cập nhật thành công!");
    } else {
      const newPoint = {
        id: Date.now(),
        name: newPointName,
        address: newPointAddress,
        type: newPointType,
        status: newPointStatus,
      };
      updatedPoints = [...reliefPoints, newPoint];
      alert("Đã thêm điểm mới!");
    }

    setReliefPoints(updatedPoints);
    localStorage.setItem("RELIEF_POINTS", JSON.stringify(updatedPoints));
    setShowAddPointModal(false);
    resetPointForm();
  };

  const handleDeletePoint = (id) => {
    if (window.confirm("Bạn có chắc muốn xóa điểm này?")) {
      const updatedPoints = reliefPoints.filter((p) => p.id !== id);
      setReliefPoints(updatedPoints);
      localStorage.setItem("RELIEF_POINTS", JSON.stringify(updatedPoints));
    }
  };

  // --- 5. XỬ LÝ TẠO YÊU CẦU SOS ---
  const handleCreateRequest = async () => {
    if (!user) {
      alert("Vui lòng đăng nhập.");
      return;
    }
    if (!reqAddress.trim()) {
      alert("Vui lòng nhập địa chỉ.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          reqAddress
        )}&limit=1`
      );
      const data = await res.json();
      let finalLocation = user.location;
      let finalAddress = reqAddress;
      if (data && data.length > 0) {
        finalLocation = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        finalAddress = data[0].display_name;
      } else {
        if (!finalLocation) {
          alert("Không tìm thấy tọa độ.");
          setIsSubmitting(false);
          return;
        }
        if (!window.confirm("Không tìm thấy tọa độ mới. Dùng vị trí cũ?")) {
          setIsSubmitting(false);
          return;
        }
      }
      const requests = JSON.parse(
        localStorage.getItem("RELIEF_REQUESTS") || "[]"
      );
      const newRequest = {
        id: Date.now(),
        userId: user.phone,
        name: user.name,
        phone: user.phone,
        address: finalAddress,
        location: finalLocation,
        type: reqType,
        description: reqDesc,
        status: "pending",
        timestamp: new Date().toLocaleString(),
      };
      const updatedRequests = [...requests, newRequest];
      localStorage.setItem("RELIEF_REQUESTS", JSON.stringify(updatedRequests));
      alert("✅ Gửi yêu cầu thành công!");
      setShowRequestForm(false);
      setReqDesc("");
    } catch (error) {
      alert("Lỗi xử lý.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("user");
    navigate("/");
  };
  const handleChooseProvince = async (province) => {
    /* Giữ nguyên logic */
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
          state: { position: [lat, lon], name: province.name },
        });
      } else {
        navigate("/map", { state: { name: province.name } });
      }
    } catch (error) {
      navigate("/map");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case "citizen":
        return "Người Dân";
      case "volunteer":
        return "Tình Nguyện Viên";
      case "volunteer-pending":
        return "TNV (Chờ duyệt)";
      case "admin":
        return "Quản Trị Viên";
      default:
        return "";
    }
  };

  // Logic Render Thông Báo
  const renderNotifications = () => {
    const isPending = user?.role === "volunteer-pending";
    const isOfficialVolunteer = user?.role === "volunteer";
    const hasMessages = notifications.length > 0;

    if (!hasMessages && !isPending && !isOfficialVolunteer) {
      return (
        <div
          style={{
            padding: "20px",
            color: "#999",
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          Không có thông báo mới.
        </div>
      );
    }

    return (
      <div>
        {isPending && (
          <div
            style={{
              padding: "15px",
              borderBottom: "1px solid #eee",
              backgroundColor: "#fff7ed",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: "#b45309",
                marginBottom: "5px",
                fontSize: "0.9rem",
              }}
            >
              ⏳ Trạng thái hồ sơ
            </div>
            <div style={{ fontSize: "0.85rem", color: "#333" }}>
              Hồ sơ đang chờ xét duyệt.
            </div>
          </div>
        )}
        {isOfficialVolunteer && (
          <div
            style={{
              padding: "15px",
              borderBottom: "1px solid #eee",
              backgroundColor: "#f0fdf4",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: "#15803d",
                marginBottom: "5px",
                fontSize: "0.9rem",
              }}
            >
              ✅ Trạng thái hồ sơ
            </div>
            <div style={{ fontSize: "0.85rem", color: "#333" }}>
              Bạn là Tình nguyện viên chính thức.
            </div>
          </div>
        )}
        {notifications.map((note, idx) => (
          <div
            key={idx}
            style={{
              padding: "15px",
              borderBottom: "1px solid #eee",
              backgroundColor: "#fff",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                color: "#007bff",
                marginBottom: "3px",
                fontSize: "0.9rem",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>🔔 Hệ thống</span>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "#999",
                  fontWeight: "normal",
                }}
              >
                {note.time.split(" ")[1]}
              </span>
            </div>
            <div
              style={{ fontSize: "0.85rem", color: "#333", lineHeight: "1.4" }}
            >
              {note.message}
            </div>
            <div
              style={{ fontSize: "0.75rem", color: "#999", marginTop: "5px" }}
            >
              {note.time.split(" ")[0]}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const hasNotification =
    user?.role === "volunteer-pending" || notifications.length > 0;

  return (
    <div className="homepage">
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div className="loading-text">Đang định vị...</div>
        </div>
      )}

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
                  <div className="imt-provinces">Đang tải...</div>
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
              style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                marginLeft: "10px",
              }}
            >
              {/* --- [ĐÃ KHÔI PHỤC] ICON THÔNG BÁO --- */}
              <div
                className="notification-icon"
                style={{
                  position: "relative",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                }}
                onClick={() => setShowNotiDropdown(!showNotiDropdown)}
              >
                🔔
                {hasNotification && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-2px",
                      right: "-2px",
                      width: "10px",
                      height: "10px",
                      backgroundColor: "#dc2626",
                      borderRadius: "50%",
                      border: "2px solid white",
                    }}
                  ></span>
                )}
                {showNotiDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "35px",
                      right: "-10px",
                      width: "320px",
                      backgroundColor: "white",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      borderRadius: "8px",
                      zIndex: 1000,
                      border: "1px solid #eee",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "15px",
                        borderBottom: "1px solid #eee",
                        fontWeight: "bold",
                        background: "#f9fafb",
                        fontSize: "1rem",
                      }}
                    >
                      Thông báo của bạn
                    </div>
                    <div
                      className="notification-list"
                      style={{ maxHeight: "350px", overflowY: "auto" }}
                    >
                      {renderNotifications()}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile */}
              <div
                className="user-profile"
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                style={{ cursor: "pointer" }}
              >
                <span className="user-name">
                  Xin chào, <strong>{user.name}</strong>{" "}
                  <small>({getRoleDisplayName(user.role)})</small> ▾
                </span>
                {showProfileDropdown && (
                  <div className="dropdown-menu">
                    <div className="dropdown-item" onClick={handleLogout}>
                      Đăng xuất
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <a href="/" style={{ color: "#007bff" }}>
              Đăng nhập
            </a>
          )}
        </nav>
      </header>

      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-content--text">
            <h1>Thông Tin Cứu Hộ</h1>
            <p>
              Dự án cộng đồng nhằm thu thập và trực quan hóa thông tin liên quan
              đến cứu trợ.
            </p>
            <div className="lst-btn-hp">
              <button className="btn-hero" onClick={() => navigate("/map")}>
                Xem Bản Đồ
              </button>
              {(user?.role === "citizen" ||
                user?.role === "volunteer-pending" ||
                user?.role === "rescuee") && (
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
        <div
          className="relief-points-section"
          style={{ padding: "40px 20px", maxWidth: "1200px", margin: "0 auto" }}
        >
          <div
            className="top-bar-table"
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "20px",
              alignItems: "center",
            }}
          >
            <h2 style={{ color: "#333", margin: 0 }}>
              Danh Sách Các Điểm Cứu Trợ
            </h2>

            <button
              className="btn-add-support"
              onClick={openAddModal}
              style={{
                backgroundColor: "#15803d",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              + Thêm điểm cứu trợ
            </button>
          </div>

          <div
            style={{
              overflowX: "auto",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
              borderRadius: "8px",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                backgroundColor: "white",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#007bff", color: "white" }}>
                  <th style={{ padding: "12px 15px", textAlign: "left" }}>
                    Tên Điểm Cứu Trợ
                  </th>
                  <th style={{ padding: "12px 15px", textAlign: "left" }}>
                    Địa Chỉ
                  </th>
                  <th style={{ padding: "12px 15px", textAlign: "left" }}>
                    Loại Hình Hỗ Trợ
                  </th>
                  <th style={{ padding: "12px 15px", textAlign: "center" }}>
                    Trạng Thái
                  </th>

                  <th
                    style={{ padding: "12px 15px", textAlign: "center" }}
                  ></th>
                </tr>
              </thead>
              <tbody>
                {reliefPoints.length > 0 ? (
                  reliefPoints.map((point) => (
                    <tr
                      key={point.id}
                      style={{ borderBottom: "1px solid #ddd" }}
                    >
                      <td
                        style={{
                          padding: "12px 15px",
                          fontWeight: "bold",
                          color: "#333",
                        }}
                      >
                        {point.name}
                      </td>
                      <td style={{ padding: "12px 15px", color: "#555" }}>
                        {point.address}
                      </td>
                      <td style={{ padding: "12px 15px", color: "#555" }}>
                        {point.type}
                      </td>
                      <td style={{ padding: "12px 15px", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "5px 10px",
                            borderRadius: "15px",
                            fontSize: "0.85rem",
                            fontWeight: "600",
                            backgroundColor:
                              point.status === "Đang hoạt động"
                                ? "#d1fae5"
                                : "#fee2e2",
                            color:
                              point.status === "Đang hoạt động"
                                ? "#065f46"
                                : "#b91c1c",
                          }}
                        >
                          {point.status}
                        </span>
                      </td>

                      <td style={{ padding: "12px 15px", textAlign: "center" }}>
                        <button
                          onClick={() => openEditModal(point)}
                          style={{
                            marginRight: "10px",
                            cursor: "pointer",
                            border: "none",
                            background: "transparent",
                            fontSize: "1.2rem",
                          }}
                          title="Sửa"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeletePoint(point.id)}
                          style={{
                            cursor: "pointer",
                            border: "none",
                            background: "transparent",
                            fontSize: "1.2rem",
                          }}
                          title="Xóa"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: "20px", textAlign: "center" }}
                    >
                      Chưa có điểm cứu trợ nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* --- PHẦN BẢNG ĐIỂM CỨU TRỢ --- */}

      <footer className="site-footer">
        <div className="footer-bottom">
          <span>© 2025 Cứu Hộ App</span>
          <span>|</span>
          <button onClick={() => window.scrollTo(0, 0)}>Trang chủ</button>
          <span>|</span>
          <button onClick={() => navigate("/map")}>Bản đồ</button>
        </div>
      </footer>

      {/* --- MODAL 1: GỬI YÊU CẦU SOS --- */}
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
          <div className="form-group" ref={wrapperRef}>
            <label>
              Địa chỉ hiện tại <span style={{ color: "red" }}>*</span>
            </label>
            <div className="address-input-container">
              <input
                type="text"
                placeholder="Nhập địa chỉ..."
                value={reqAddress}
                onChange={handleReqAddressChange}
                onFocus={() =>
                  reqAddress &&
                  setActiveAutocomplete("sos") &&
                  setShowSuggestions(true)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #007bff",
                }}
                autoComplete="off"
              />
              <small style={{ color: "#666", fontSize: "0.85rem" }}>
                📍 Hệ thống sẽ định vị lại.
              </small>
              {showSuggestions &&
                activeAutocomplete === "sos" &&
                suggestions.length > 0 && (
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

      {/* --- MODAL 2: THÊM / SỬA ĐIỂM CỨU TRỢ --- */}
      {showAddPointModal && (
        <Modal
          title={
            editingPoint ? "Cập nhật Điểm Cứu Trợ" : "Thêm Điểm Cứu Trợ Mới"
          }
          onClose={() => setShowAddPointModal(false)}
        >
          <div className="form-group">
            <label>
              Tên điểm <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              value={newPointName}
              onChange={(e) => setNewPointName(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ddd",
              }}
            />
          </div>
          <div className="form-group" ref={pointWrapperRef}>
            <label>
              Địa chỉ <span style={{ color: "red" }}>*</span>
            </label>
            <div className="address-input-container">
              <input
                type="text"
                value={newPointAddress}
                onChange={handlePointAddressChange}
                onFocus={() =>
                  newPointAddress &&
                  setActiveAutocomplete("point") &&
                  setShowSuggestions(true)
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #007bff",
                }}
                autoComplete="off"
              />
              {showSuggestions &&
                activeAutocomplete === "point" &&
                suggestions.length > 0 && (
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
            <label>Loại hình</label>
            <input
              type="text"
              value={newPointType}
              onChange={(e) => setNewPointType(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ddd",
              }}
            />
          </div>
          <div className="form-group">
            <label>Trạng thái</label>
            <select
              value={newPointStatus}
              onChange={(e) => setNewPointStatus(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ddd",
              }}
            >
              <option value="Đang hoạt động">Đang hoạt động</option>
              <option value="Tạm ngưng">Tạm ngưng</option>
              <option value="Đầy chỗ">Đầy chỗ</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <button
              className="btn-primary"
              onClick={handleSavePoint}
              style={{ backgroundColor: "#15803d", flex: 1 }}
            >
              {editingPoint ? "Lưu Cập Nhật" : "Thêm Điểm"}
            </button>
            <button
              onClick={() => {
                setShowAddPointModal(false);
                resetPointForm();
              }}
              style={{
                backgroundColor: "#666",
                color: "white",
                border: "none",
                padding: "10px",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Hủy
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HomePage;
