// src/modules/home/HomePage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios"; 
import Modal from "../../components/Modal";
import "./HomePage.css";

const API_BASE = "http://localhost:5075/api";

const HomePage = () => {
  const navigate = useNavigate();
  
  // 1. KHỞI TẠO USER
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("currentUser");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [notifications, setNotifications] = useState([]);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);

  // State Header & Loading
  const [provinces, setProvinces] = useState([]);
  // [FIX] Mặc định là Hà Nội để API không bị lỗi khi vào trang
  const [currentProvince, setCurrentProvince] = useState({ name: "Hà Nội" }); 
  const [showLocaDropdown, setShowLocaDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form SOS
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqType, setReqType] = useState("Cần lương thực");
  const [reqDesc, setReqDesc] = useState("");
  const [reqAddress, setReqAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- STATE ĐIỂM CỨU TRỢ (RELIEF POINTS) ---
  const [reliefPoints, setReliefPoints] = useState([]);
  const [showAddPointModal, setShowAddPointModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  
  // State Form Thêm/Sửa Điểm
  const [newPointName, setNewPointName] = useState("");
  const [newPointAddress, setNewPointAddress] = useState("");
  const [newPointType, setNewPointType] = useState("Thực phẩm, Nước sạch");
  const [newPointStatus, setNewPointStatus] = useState("Đang hoạt động");

  // Autocomplete
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeAutocomplete, setActiveAutocomplete] = useState(null);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  const pointWrapperRef = useRef(null);

  // --- [FIX API] HÀM LẤY ĐIỂM CỨU TRỢ THEO TỈNH ---
  const fetchReliefPoints = async (provinceName) => {
    try {
        // Encode tên tỉnh để xử lý tiếng Việt (VD: "Hà Nội" -> "H%C3%A0%20N%E1%BB%99i")
        const safeProvince = encodeURIComponent(provinceName);
        console.log(`📡 Đang tải điểm cứu trợ tại: ${provinceName}...`);
        
        // Dùng đúng API trong Swagger: /api/safety/nearby/{province}
        const res = await axios.get(`${API_BASE}/safety/nearby/${safeProvince}`);
        
        setReliefPoints(res.data || []);
        localStorage.setItem("RELIEF_POINTS", JSON.stringify(res.data || []));
    } catch (error) {
        console.error("❌ Lỗi lấy điểm cứu trợ:", error);
        // Fallback: Lấy từ localStorage nếu API lỗi để không trống trơn
        const storedPoints = localStorage.getItem("RELIEF_POINTS");
        if (storedPoints) setReliefPoints(JSON.parse(storedPoints));
    }
  };

  // 2. LOGIC ĐỒNG BỘ DỮ LIỆU KHI MOUNT
  useEffect(() => {
    const syncUserData = async () => {
      const savedUserStr = localStorage.getItem("currentUser");
      if (savedUserStr) {
        try {
            const localData = JSON.parse(savedUserStr);
            const userId = localData.id || localData.userId;

            if (userId) {
                const res = await axios.get(`${API_BASE}/user/${userId}/get-user-by-id`);
                if (res.data) {
                    let realUser = res.data.user || res.data; 
                    setUser(realUser);
                    localStorage.setItem("currentUser", JSON.stringify(realUser));
                }
            }
        } catch (error) {
            console.error("❌ Lỗi API User:", error);
        }
      }
    };

    // [FIX] Gọi API lần đầu với tỉnh mặc định (Hà Nội)
    fetchReliefPoints("Hà Nội");
    syncUserData();
  }, []);

  // --- HELPER LOGIC ---
  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
    setUser(null); 
    navigate("/");
  };

  const getRoleDisplayName = (role) => {
    if (!role) return "";
    if (role === 'volunteer' && user?.status !== 'active') return "TNV (Chờ duyệt)";
    switch (role) {
      case "citizen": return "Người Dân";
      case "volunteer": return "Tình Nguyện Viên";
      case "admin": return "Quản Trị Viên";
      default: return role;
    }
  };

  const canManagePoints = user && (
    user.role === "admin" || 
    (user.role === "volunteer" && user.status === "active")
  );

  // --- Logic hiển thị thông báo Pending ---
  const renderNotifications = () => {
    const isPending = user?.role === "volunteer" && user?.status !== "active"; 
    return (
      <div>
        {isPending && (
          <div style={{ padding: "15px", borderBottom: "1px solid #eee", backgroundColor: "#fff7ed" }}>
            <div style={{ fontWeight: "bold", color: "#b45309" }}>⏳ Trạng thái hồ sơ</div>
            <div style={{ fontSize: "0.85rem" }}>Tài khoản đang chờ duyệt.<br/>Tạm thời chỉ có quyền Người dân.</div>
          </div>
        )}
        {notifications.length === 0 && !isPending && (
             <div style={{ padding: "20px", color: "#999", textAlign: "center" }}>Không có thông báo mới.</div>
        )}
      </div>
    );
  };

  // --- Các Hook phụ ---
  useEffect(() => {
      if(user) {
        const allNotis = JSON.parse(localStorage.getItem("SYSTEM_NOTIFICATIONS") || "[]");
        setNotifications(allNotis);
      }
  }, [user]);

  useEffect(() => {
    const fetchApiProvinces = async () => {
      try {
        const res = await fetch("https://provinces.open-api.vn/api/v2/?depth=1");
        setProvinces(await res.json());
      } catch (error) { console.error("Lỗi API Tỉnh: ", error); }
    };
    fetchApiProvinces();
  }, []);

  useEffect(() => { if (showRequestForm && user) setReqAddress(user.address || ""); }, [showRequestForm, user]);

  useEffect(() => {
    function handleClickOutside(event) {
      const clickedInsideSOS = wrapperRef.current && wrapperRef.current.contains(event.target);
      const clickedInsidePoint = pointWrapperRef.current && pointWrapperRef.current.contains(event.target);
      if (!clickedInsideSOS && !clickedInsidePoint) { setShowSuggestions(false); setActiveAutocomplete(null); }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, pointWrapperRef]);

  // Handlers rút gọn
  const filterUniqueSuggestions = (data) => { const seen = new Set(); return data.filter((item) => { const duplicate = seen.has(item.display_name); seen.add(item.display_name); return !duplicate; }); };
  const fetchSuggestions = (query) => { if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(async () => { try { const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=vn`); const data = await res.json(); setSuggestions(filterUniqueSuggestions(data)); setShowSuggestions(true); } catch (error) { console.error("Lỗi gợi ý:", error); } }, 200); };
  const handleReqAddressChange = (e) => { const value = e.target.value; setReqAddress(value); setActiveAutocomplete("sos"); if (!value.trim()) { setSuggestions([]); setShowSuggestions(false); return; } fetchSuggestions(value); };
  
  const handlePointAddressChange = (e) => { const value = e.target.value; setNewPointAddress(value); setActiveAutocomplete("point"); if (!value.trim()) { setSuggestions([]); setShowSuggestions(false); return; } fetchSuggestions(value); };
  
  const handleSelectSuggestion = (item) => { if (activeAutocomplete === "sos") setReqAddress(item.display_name); else if (activeAutocomplete === "point") setNewPointAddress(item.display_name); setShowSuggestions(false); setActiveAutocomplete(null); };
  
  const resetPointForm = () => { setNewPointName(""); setNewPointAddress(""); setNewPointType("Thực phẩm, Nước sạch"); setNewPointStatus("Đang hoạt động"); setEditingPoint(null); };
  const openAddModal = () => { resetPointForm(); setShowAddPointModal(true); };
  
  const openEditModal = (point) => { setEditingPoint(point); setNewPointName(point.name); setNewPointAddress(point.address); setNewPointType(point.type); setNewPointStatus(point.status); setShowAddPointModal(true); };

  // --- LOGIC LƯU ĐIỂM CỨU TRỢ ---
  const handleSavePoint = async () => {
    if (!newPointName || !newPointAddress) { alert("Vui lòng nhập đủ thông tin!"); return; }
    
    setIsLoading(true);
    try {
        let coords = [0, 0];
        try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newPointAddress)}&limit=1`);
            const geoData = await geoRes.json();
            if (geoData && geoData.length > 0) {
                coords = [parseFloat(geoData[0].lat), parseFloat(geoData[0].lon)];
            }
        } catch (e) { console.warn("Không lấy được tọa độ:", e); }

        const token = localStorage.getItem("accessToken");
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        const payload = {
            name: newPointName,
            address: newPointAddress,
            type: newPointType,
            status: newPointStatus,
            latitude: coords[0],
            longitude: coords[1],
            description: "Thêm từ trang chủ" 
        };

        if (editingPoint) {
            // API PUT (Giả định, nếu chưa có thì cần thêm vào backend)
            await axios.put(`${API_BASE}/safety/safetypoint/${editingPoint.id}`, payload, config);
            
            const updatedPoints = reliefPoints.map((p) => p.id === editingPoint.id ? { ...p, ...payload, location: coords } : p);
            setReliefPoints(updatedPoints);
            alert("✅ Đã cập nhật!");
        } else {
            // API POST (Đã có trong Swagger)
            const res = await axios.post(`${API_BASE}/safety/safetypoint/create`, payload, config);
            
            const newPoint = res.data || { ...payload, id: Date.now(), location: coords }; 
            const updatedPoints = [...reliefPoints, newPoint];
            setReliefPoints(updatedPoints);
            alert("✅ Đã thêm mới!");
        }
        setShowAddPointModal(false);
        resetPointForm();
    } catch (error) {
        console.error("Lỗi lưu điểm:", error);
        alert(`❌ Có lỗi: ${error.response?.data?.message || error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeletePoint = async (id) => {
    if (!window.confirm("Xóa điểm này?")) return;
    setIsLoading(true);
    try {
        const token = localStorage.getItem("accessToken");
        // API DELETE (Giả định)
        await axios.delete(`${API_BASE}/safety/safetypoint/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        
        const updatedPoints = reliefPoints.filter((p) => p.id !== id);
        setReliefPoints(updatedPoints);
        alert("🗑️ Đã xóa điểm cứu trợ.");
    } catch (error) {
        console.error("Lỗi xóa điểm:", error);
        alert("❌ Xóa thất bại (API chưa hỗ trợ hoặc lỗi mạng).");
    } finally {
        setIsLoading(false);
    }
  };

  const handleViewOnMap = async (point) => { setIsLoading(true); try { if (!point.location) { const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(point.address)}&limit=1`); const data = await res.json(); if (data && data.length > 0) { const lat = parseFloat(data[0].lat); const lon = parseFloat(data[0].lon); navigate("/map", { state: { position: [lat, lon], name: point.name } }); } else { alert("Không tìm thấy tọa độ!"); navigate("/map"); } } else { navigate("/map", { state: { position: point.location, name: point.name } }); } } catch (error) { navigate("/map"); } finally { setIsLoading(false); } };
  
  const handleCreateRequest = async () => { if (!user) { alert("Vui lòng đăng nhập."); return; } if (!reqAddress.trim()) { alert("Vui lòng nhập địa chỉ."); return; } setIsSubmitting(true); try { const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(reqAddress)}&limit=1`); const data = await res.json(); let finalLocation = user.location; let finalAddress = reqAddress; if (data && data.length > 0) { finalLocation = [parseFloat(data[0].lat), parseFloat(data[0].lon)]; finalAddress = data[0].display_name; } else { if (!finalLocation) { alert("Không tìm thấy tọa độ."); setIsSubmitting(false); return; } if (!window.confirm("Không tìm thấy tọa độ mới. Dùng vị trí cũ?")) { setIsSubmitting(false); return; } } const requests = JSON.parse(localStorage.getItem("RELIEF_REQUESTS") || "[]"); const newRequest = { id: Date.now(), userId: user.phone, name: user.fullName || user.name, phone: user.phone, address: finalAddress, location: finalLocation, type: reqType, description: reqDesc, status: "pending", timestamp: new Date().toLocaleString(), }; localStorage.setItem("RELIEF_REQUESTS", JSON.stringify([...requests, newRequest])); alert("✅ Gửi thành công!"); setShowRequestForm(false); setReqDesc(""); } catch (error) { alert("Lỗi xử lý."); } finally { setIsSubmitting(false); } };
  
  // [FIX] Cập nhật hàm chọn tỉnh để reload dữ liệu theo API mới
  const handleChooseProvince = async (province) => { 
      setCurrentProvince(province); 
      setShowLocaDropdown(false); 
      
      // Load lại danh sách điểm an toàn theo tỉnh mới
      fetchReliefPoints(province.name);

      setIsLoading(true); 
      try { 
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(province.name + ", Việt Nam")}&format=json&limit=1`); 
          const data = await res.json(); 
          // Chỉ lấy dữ liệu để update view nếu cần, nhưng fetchReliefPoints đã lo phần data rồi
      } catch (error) { } 
      finally { setIsLoading(false); } 
  };

  return (
    <div className="homepage">
      {isLoading && <div className="loading-overlay"><div className="spinner"></div><div className="loading-text">Đang tải...</div></div>}

      <header className="site-header">
        <div className="logo-area">
          <div className="logo-group" onClick={() => navigate("/home")}><span className="logo-icon">🚨</span><span className="logo-text">Cứu Hộ</span></div>
          <div className="box-location">
            <div className="location-badge" onClick={() => setShowLocaDropdown(!showLocaDropdown)}>{currentProvince ? currentProvince.name : "Chọn tỉnh"} ▾</div>
            {showLocaDropdown && <div className="lst-provinces-drop">{provinces.length > 0 ? provinces.map((prov) => (<div key={prov.code} onClick={() => handleChooseProvince(prov)} className="imt-provinces">{prov.name}</div>)) : <div className="imt-provinces">Đang tải...</div>}</div>}
          </div>
        </div>
        <nav className="main-nav">
          <a href="#" className="active">Trang chủ</a>
          <a onClick={() => navigate("/map")}>Bản đồ</a>
          <a onClick={() => navigate("/about")}>Liên hệ</a>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginLeft: "10px" }}>
              <div className="notification-icon" style={{ position: "relative", cursor: "pointer", fontSize: "1.2rem" }} onClick={() => setShowNotiDropdown(!showNotiDropdown)}>
                🔔 {notifications.length > 0 && <span style={{ position: "absolute", top: "-2px", right: "-2px", width: "10px", height: "10px", backgroundColor: "#dc2626", borderRadius: "50%", border: "2px solid white" }}></span>}
                {showNotiDropdown && <div style={{ position: "absolute", top: "35px", right: "-10px", width: "320px", backgroundColor: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", borderRadius: "8px", zIndex: 1000, border: "1px solid #eee", overflow: "hidden" }}><div style={{ padding: "15px", borderBottom: "1px solid #eee", fontWeight: "bold", background: "#f9fafb", fontSize: "1rem" }}>Thông báo</div><div className="notification-list" style={{ maxHeight: "350px", overflowY: "auto" }}>{renderNotifications()}</div></div>}
              </div>
              <div className="user-profile" onClick={() => setShowProfileDropdown(!showProfileDropdown)} style={{ cursor: "pointer" }}>
                <span className="user-name">
                  Xin chào, <strong>{user?.fullName || user?.name || "Bạn"}</strong> <small>({getRoleDisplayName(user.role)})</small> ▾
                </span>
                {showProfileDropdown && <div className="dropdown-menu"><div className="dropdown-item" onClick={handleLogout}>Đăng xuất</div></div>}
              </div>
            </div>
          ) : (
            <a href="/" style={{ color: "#007bff" }}>Đăng nhập</a>
          )}
        </nav>
      </header>
      
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-content--text">
            <h1>Thông Tin Cứu Hộ</h1><p>Dự án cộng đồng nhằm thu thập và trực quan hóa thông tin liên quan đến cứu trợ.</p>
            <div className="lst-btn-hp">
                <button className="btn-hero" onClick={() => navigate("/map")}>Xem Bản Đồ</button>
            </div>
          </div>
        </div>
        <div className="relief-points-section" style={{ padding: "40px 20px", width: "100%", maxWidth: "1600px", margin: "0 auto" }}>
          <div className="top-bar-table" style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
              <h2 style={{ color: "#333", margin: 0 }}>Danh Sách Các Điểm Cứu Trợ ({currentProvince?.name || "Toàn quốc"})</h2>
              {canManagePoints && (
                  <button className="btn-add-support" onClick={openAddModal} style={{ backgroundColor: "#15803d", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "1rem" }}>
                      + Thêm điểm cứu trợ
                  </button>
              )}
          </div>
          <div style={{ overflowX: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", borderRadius: "10px", border: "1px solid #eee" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white", minWidth: "900px" }}>
              <thead><tr style={{ backgroundColor: "#f8f9fa", color: "#333", borderBottom: "2px solid #eee" }}><th style={{ padding: "16px", textAlign: "left", fontSize: "0.95rem" }}>Tên Điểm Cứu Trợ</th><th style={{ padding: "16px", textAlign: "left", fontSize: "0.95rem" }}>Địa Chỉ</th><th style={{ padding: "16px", textAlign: "left", fontSize: "0.95rem" }}>Loại Hình Hỗ Trợ</th><th style={{ padding: "16px", textAlign: "center", fontSize: "0.95rem" }}>Trạng Thái</th><th style={{ padding: "16px", textAlign: "center", fontSize: "0.95rem" }}>Hành động</th></tr></thead>
              <tbody>
                {reliefPoints.length > 0 ? reliefPoints.map((point, index) => (
                    <tr key={point.id} style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: index % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ padding: "16px", fontWeight: "600", color: "#2d3748" }}>{point.name}</td>
                      <td style={{ padding: "16px", color: "#4a5568" }}>{point.address}</td>
                      <td style={{ padding: "16px", color: "#4a5568" }}>{point.type}</td>
                      <td style={{ padding: "16px", textAlign: "center" }}><span style={{ padding: "6px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "600", backgroundColor: point.status === "Đang hoạt động" ? "#def7ec" : "#fde8e8", color: point.status === "Đang hoạt động" ? "#03543f" : "#9b1c1c", border: point.status === "Đang hoạt động" ? "1px solid #bcf0da" : "1px solid #fbd5d5" }}>{point.status}</span></td>
                      <td style={{ padding: "16px", textAlign: "center" }}><div style={{ display: "flex", justifyContent: "center", gap: "8px" }}><button onClick={() => handleViewOnMap(point)} style={{ cursor: "pointer", border: "1px solid #3b82f6", background: "white", color: "#3b82f6", padding: "6px 12px", borderRadius: "6px", fontWeight: "600", fontSize: "0.85rem" }}>Xem vị trí</button>
                      {canManagePoints && <><button onClick={() => openEditModal(point)} style={{ cursor: "pointer", border: "1px solid #f59e0b", background: "white", color: "#f59e0b", padding: "6px 12px", borderRadius: "6px", fontWeight: "600", fontSize: "0.85rem" }}>Sửa</button><button onClick={() => handleDeletePoint(point.id)} style={{ cursor: "pointer", border: "1px solid #ef4444", background: "white", color: "#ef4444", padding: "6px 12px", borderRadius: "6px", fontWeight: "600", fontSize: "0.85rem" }}>Xóa</button></>}</div></td>
                    </tr>
                  )) : <tr><td colSpan={canManagePoints ? 5 : 4} style={{ padding: "30px", textAlign: "center", color: "#666", fontStyle: "italic" }}>Chưa có điểm cứu trợ nào ở {currentProvince?.name}.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <footer className="site-footer"><div className="footer-bottom"><span>© 2025 Cứu Hộ App</span><span>|</span><button onClick={() => window.scrollTo(0, 0)}>Trang chủ</button><span>|</span><button onClick={() => navigate("/map")}>Bản đồ</button></div></footer>
      {showRequestForm && <Modal title="Gửi yêu cầu khẩn cấp" onClose={() => setShowRequestForm(false)}><div className="form-group"><label>Bạn cần giúp gì?</label><select value={reqType} onChange={(e) => setReqType(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}><option>Cần lương thực</option><option>Cần thuốc men / Y tế</option><option>Cần sơ tán khẩn cấp</option><option>Cần áo phao / Thuyền</option><option>Khác</option></select></div><div className="form-group" ref={wrapperRef}><label>Địa chỉ <span style={{ color: "red" }}>*</span></label><div className="address-input-container"><input type="text" value={reqAddress} onChange={handleReqAddressChange} onFocus={() => reqAddress && setActiveAutocomplete("sos") && setShowSuggestions(true)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #007bff" }} autoComplete="off" />{showSuggestions && activeAutocomplete === "sos" && suggestions.length > 0 && (<div className="suggestions-dropdown">{suggestions.map((item, index) => (<div key={index} className="suggestion-item" onClick={() => handleSelectSuggestion(item)}><span style={{ fontSize: "1.2rem" }}>📍</span><span className="suggestion-text">{item.display_name}</span></div>))}</div>)}</div></div><div className="form-group"><label>Mô tả</label><textarea value={reqDesc} onChange={(e) => setReqDesc(e.target.value)} style={{ width: "100%", padding: "10px" }} /></div><button className="btn-primary" style={{ backgroundColor: "#dc2626", marginTop: "10px" }} onClick={handleCreateRequest} disabled={isSubmitting}>Gửi</button></Modal>}
      {showAddPointModal && <Modal title={editingPoint ? "Cập nhật Điểm" : "Thêm Điểm Mới"} onClose={() => setShowAddPointModal(false)}><div className="form-group"><label>Tên điểm <span style={{ color: "red" }}>*</span></label><input type="text" value={newPointName} onChange={(e) => setNewPointName(e.target.value)} style={{ width: "100%", padding: "10px" }} /></div><div className="form-group" ref={pointWrapperRef}><label>Địa chỉ <span style={{ color: "red" }}>*</span></label><div className="address-input-container"><input type="text" value={newPointAddress} onChange={handlePointAddressChange} onFocus={() => newPointAddress && setActiveAutocomplete("point") && setShowSuggestions(true)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #007bff" }} autoComplete="off" />{showSuggestions && activeAutocomplete === "point" && suggestions.length > 0 && (<div className="suggestions-dropdown">{suggestions.map((item, index) => (<div key={index} className="suggestion-item" onClick={() => handleSelectSuggestion(item)}><span style={{ fontSize: "1.2rem" }}>📍</span><span className="suggestion-text">{item.display_name}</span></div>))}</div>)}</div></div><div className="form-group"><label>Loại hình</label><input type="text" value={newPointType} onChange={(e) => setNewPointType(e.target.value)} style={{ width: "100%", padding: "10px" }} /></div><div className="form-group"><label>Trạng thái</label><select value={newPointStatus} onChange={(e) => setNewPointStatus(e.target.value)} style={{ width: "100%", padding: "10px" }}><option>Đang hoạt động</option><option>Tạm ngưng</option><option>Đầy chỗ</option></select></div><div style={{ display: "flex", gap: "10px", marginTop: "10px" }}><button className="btn-primary" onClick={handleSavePoint} style={{ backgroundColor: "#15803d", flex: 1 }}>{editingPoint ? "Lưu" : "Thêm"}</button><button onClick={() => { setShowAddPointModal(false); resetPointForm(); }} style={{ backgroundColor: "#666", color: "white", padding: "10px", borderRadius: "5px", border: "none" }}>Hủy</button></div></Modal>}
    </div>
  );
};

export default HomePage;