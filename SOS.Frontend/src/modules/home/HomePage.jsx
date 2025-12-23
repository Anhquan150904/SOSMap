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
  
  // State profile
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // State Header & Loading
  const [provinces, setProvinces] = useState([]);
  const [currentProvince, setCurrentProvince] = useState({ name: "Toàn quốc" }); 
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
  const [newPointStatus, setNewPointStatus] = useState("Active");

  // Autocomplete
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeAutocomplete, setActiveAutocomplete] = useState(null);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);
  const pointWrapperRef = useRef(null);

  // --- FETCH RELIEF POINTS ---
  const fetchReliefPoints = async () => {
    try {
        console.log(`📡 Đang tải điểm cứu trợ toàn quốc...`);
        const [resActive, resInactive, resFull] = await Promise.all([
            axios.get(`${API_BASE}/safety/get-by-status/Active`).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/safety/get-by-status/Inactive`).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/safety/get-by-status/Full`).catch(() => ({ data: [] }))
        ]);

        const rawPoints = [...(resActive.data || []), ...(resInactive.data || []), ...(resFull.data || [])];
        const uniquePointsMap = new Map();
        rawPoints.forEach(point => { if (point.id && !uniquePointsMap.has(point.id)) uniquePointsMap.set(point.id, point); });
        const uniquePoints = Array.from(uniquePointsMap.values());
        const sortedPoints = uniquePoints.sort((a, b) => (b.id || 0) - (a.id || 0));

        setReliefPoints(sortedPoints);
        localStorage.setItem("RELIEF_POINTS", JSON.stringify(sortedPoints));
    } catch (error) {
        console.error("❌ Lỗi lấy điểm cứu trợ:", error);
        const storedPoints = localStorage.getItem("RELIEF_POINTS");
        if (storedPoints) setReliefPoints(JSON.parse(storedPoints));
    }
  };

  // --- SYNC USER DATA ---
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
                    // Giữ lại token cũ nếu API không trả về
                    if (localData.token && !realUser.token) realUser.token = localData.token;
                    setUser(realUser);
                    localStorage.setItem("currentUser", JSON.stringify(realUser));
                }
            }
        } catch (error) { console.error("❌ Lỗi API User:", error); }
      }
    };
    fetchReliefPoints();
    syncUserData();
  }, []);

  // --- HELPER LOGIC ---
  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("MAP_NOTIFICATIONS");
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

  // --- AUTOCOMPLETE LOGIC ---
  useEffect(() => { const fetchApiProvinces = async () => { try { const res = await fetch("https://provinces.open-api.vn/api/v2/?depth=1"); setProvinces(await res.json()); } catch (error) {} }; fetchApiProvinces(); }, []);
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

  const filterUniqueSuggestions = (data) => { const seen = new Set(); return data.filter((item) => { const duplicate = seen.has(item.display_name); seen.add(item.display_name); return !duplicate; }); };
  const fetchSuggestions = (query) => { if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(async () => { try { const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=vn`); const data = await res.json(); setSuggestions(filterUniqueSuggestions(data)); setShowSuggestions(true); } catch (error) {} }, 200); };
  const handleReqAddressChange = (e) => { const value = e.target.value; setReqAddress(value); setActiveAutocomplete("sos"); if (!value.trim()) { setSuggestions([]); setShowSuggestions(false); return; } fetchSuggestions(value); };
  const handlePointAddressChange = (e) => { const value = e.target.value; setNewPointAddress(value); setActiveAutocomplete("point"); if (!value.trim()) { setSuggestions([]); setShowSuggestions(false); return; } fetchSuggestions(value); };
  const handleSelectSuggestion = (item) => { if (activeAutocomplete === "sos") setReqAddress(item.display_name); else if (activeAutocomplete === "point") setNewPointAddress(item.display_name); setShowSuggestions(false); setActiveAutocomplete(null); };
  
  const resetPointForm = () => { setNewPointName(""); setNewPointAddress(""); setNewPointType("Thực phẩm, Nước sạch"); setNewPointStatus("Active"); setEditingPoint(null); };
  const openAddModal = () => { resetPointForm(); setShowAddPointModal(true); };
  const openEditModal = (point) => { setEditingPoint(point); setNewPointName(point.name); setNewPointAddress(point.address); setNewPointType(point.type); setNewPointStatus(point.status === "Đang hoạt động" ? "Active" : point.status); setShowAddPointModal(true); };

  // --- SAVE POINT ---
  const handleSavePoint = async () => {
    if (!newPointName || !newPointAddress) { alert("Vui lòng nhập đủ thông tin!"); return; }
    setIsLoading(true);
    try {
        let coords = [0, 0];
        try { const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newPointAddress)}&limit=1`); const geoData = await geoRes.json(); if (geoData && geoData.length > 0) coords = [parseFloat(geoData[0].lat), parseFloat(geoData[0].lon)]; } catch (e) {}
        const token = localStorage.getItem("accessToken");
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const payload = { name: newPointName, address: newPointAddress, type: newPointType, status: newPointStatus, latitude: coords[0], longitude: coords[1], description: "Thêm từ trang chủ" };
        if (editingPoint) { await axios.put(`${API_BASE}/safety/safetypoint/${editingPoint.id}/update`, payload, config); alert("✅ Đã cập nhật điểm an toàn!"); } 
        else { await axios.post(`${API_BASE}/safety/safetypoint/create`, payload, config); alert("✅ Đã thêm mới điểm an toàn!"); }
        setShowAddPointModal(false); resetPointForm(); fetchReliefPoints();
    } catch (error) { alert(`❌ Có lỗi: ${error.message}`); } finally { setIsLoading(false); }
  };

  const handleDeletePoint = async (id) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa điểm này?")) return;
    setIsLoading(true);
    try { const token = localStorage.getItem("accessToken"); await axios.delete(`${API_BASE}/safety/safetypoint/${id}/delete`, { headers: { Authorization: `Bearer ${token}` } }); const updatedPoints = reliefPoints.filter((p) => p.id !== id); setReliefPoints(updatedPoints); alert("🗑️ Đã xóa điểm an toàn."); } catch (error) { alert("❌ Xóa thất bại."); } finally { setIsLoading(false); }
  };

  const handleViewOnMap = async (point) => { setIsLoading(true); try { if (!point.location) { const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(point.address)}&limit=1`); const data = await res.json(); if (data && data.length > 0) { const lat = parseFloat(data[0].lat); const lon = parseFloat(data[0].lon); navigate("/map", { state: { position: [lat, lon], name: point.name } }); } else { alert("Không tìm thấy tọa độ!"); navigate("/map"); } } else { navigate("/map", { state: { position: point.location, name: point.name } }); } } catch (error) { navigate("/map"); } finally { setIsLoading(false); } };
  
  const handleCreateRequest = async () => { if (!user) { alert("Vui lòng đăng nhập."); return; } if (!reqAddress.trim()) { alert("Vui lòng nhập địa chỉ."); return; } setIsSubmitting(true); try { const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(reqAddress)}&limit=1`); const data = await res.json(); let finalLocation = user.location; let finalAddress = reqAddress; if (data && data.length > 0) { finalLocation = [parseFloat(data[0].lat), parseFloat(data[0].lon)]; finalAddress = data[0].display_name; } const token = localStorage.getItem("accessToken"); const payload = { phone: user.phone, name: user.fullName || user.name, address: finalAddress, details: reqDesc, level: reqType, latitude: finalLocation ? finalLocation[0] : 0, longitude: finalLocation ? finalLocation[1] : 0 }; await axios.post(`${API_BASE}/reports`, payload, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }); alert("✅ Gửi tín hiệu SOS thành công!"); setShowRequestForm(false); setReqDesc(""); } catch (error) { console.error(error); alert("Gửi thất bại."); } finally { setIsSubmitting(false); } };
  
  const handleChooseProvince = async (province) => { setCurrentProvince(province); setShowLocaDropdown(false); };

  return (
    <div className="homepage">
      {isLoading && <div className="loading-overlay"><div className="spinner"></div><div className="loading-text">Đang xử lý...</div></div>}

      <header className="site-header">
        <div className="logo-area">
          <div className="logo-group" onClick={() => navigate("/home")}><span className="logo-icon">🚨</span><span className="logo-text">Cứu Hộ</span></div>
          <div className="box-location">
            <div className="location-badge" onClick={() => setShowLocaDropdown(!showLocaDropdown)}>{currentProvince ? currentProvince.name : "Toàn quốc"} ▾</div>
            {showLocaDropdown && <div className="lst-provinces-drop">{provinces.length > 0 ? provinces.map((prov) => (<div key={prov.code} onClick={() => handleChooseProvince(prov)} className="imt-provinces">{prov.name}</div>)) : <div className="imt-provinces">Đang tải...</div>}</div>}
          </div>
        </div>
        <nav className="main-nav">
          <a href="#" className="active">Trang chủ</a>
          <a onClick={() => navigate("/map")}>Bản đồ</a>
          <a onClick={() => navigate("/about")}>Liên hệ</a>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginLeft: "10px" }}>
              <div className="user-profile" onClick={() => setShowProfileDropdown(!showProfileDropdown)} style={{ cursor: "pointer" }}>
                <span className="user-name">Xin chào, <strong>{user?.fullName || user?.name || "Bạn"}</strong> <small>({getRoleDisplayName(user.role)})</small> ▾</span>
                {showProfileDropdown && <div className="dropdown-menu"><div className="dropdown-item" onClick={handleLogout}>Đăng xuất</div></div>}
              </div>
            </div>
          ) : ( <a href="/" style={{ color: "#007bff" }}>Đăng nhập</a> )}
        </nav>
      </header>
      
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-content--text"><h1>Thông Tin Cứu Hộ</h1><p>Dự án cộng đồng nhằm thu thập và trực quan hóa thông tin liên quan đến cứu trợ.</p><div className="lst-btn-hp"><button className="btn-hero" onClick={() => navigate("/map")}>Xem Bản Đồ</button></div></div>
        </div>
        <div className="relief-points-section" style={{ padding: "40px 20px", width: "100%", maxWidth: "1600px", margin: "0 auto" }}>
          <div className="top-bar-table" style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
              <h2 style={{ color: "#333", margin: 0 }}>Danh Sách Các Điểm Cứu Trợ (Toàn Quốc)</h2>
              {canManagePoints && (<button className="btn-add-support" onClick={openAddModal} style={{ backgroundColor: "#15803d", color: "white", border: "none", padding: "10px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "1rem" }}>+ Thêm điểm cứu trợ</button>)}
          </div>
          <div style={{ overflowX: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", borderRadius: "10px", border: "1px solid #eee" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "white", minWidth: "900px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8f9fa", color: "#333", borderBottom: "2px solid #eee" }}><th style={{ padding: "16px", textAlign: "left", fontSize: "0.95rem", width: "20%" }}>Tên Điểm Cứu Trợ</th><th style={{ padding: "16px", textAlign: "left", fontSize: "0.95rem", width: "35%" }}>Địa Chỉ</th><th style={{ padding: "16px", textAlign: "left", fontSize: "0.95rem", width: "15%" }}>Loại Hình Hỗ Trợ</th><th style={{ padding: "16px", textAlign: "center", fontSize: "0.95rem", width: "15%" }}>Trạng Thái</th><th style={{ padding: "16px", textAlign: "center", fontSize: "0.95rem", width: "15%" }}>Hành động</th></tr>
              </thead>
              <tbody>
                {reliefPoints.length > 0 ? reliefPoints.map((point, index) => (
                    <tr key={point.id} style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: index % 2 === 0 ? "white" : "#fafafa" }}>
                      <td style={{ padding: "16px", fontWeight: "600", color: "#2d3748", verticalAlign: "middle" }}>{point.name}</td>
                      <td style={{ padding: "16px", color: "#4a5568", verticalAlign: "middle" }}>{point.address}</td>
                      <td style={{ padding: "16px", color: "#4a5568", verticalAlign: "middle" }}>{point.type}</td>
                      <td style={{ padding: "16px", textAlign: "center", verticalAlign: "middle" }}><span style={{ display: "inline-block", padding: "6px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "600", whiteSpace: "nowrap", backgroundColor: point.status === "Active" ? "#def7ec" : point.status === "Full" ? "#fef3c7" : "#f3f4f6", color: point.status === "Active" ? "#03543f" : point.status === "Full" ? "#b45309" : "#1f2937", border: point.status === "Active" ? "1px solid #bcf0da" : point.status === "Full" ? "1px solid #fcd34d" : "1px solid #e5e7eb" }}>{point.status === "Active" ? "Đang hoạt động" : point.status === "Full" ? "Đầy chỗ" : "Tạm ngưng"}</span></td> 
                      <td style={{ padding: "16px", textAlign: "center", verticalAlign: "middle" }}><div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}><button onClick={() => handleViewOnMap(point)} style={{ cursor: "pointer", border: "1px solid #3b82f6", background: "white", color: "#3b82f6", padding: "6px 12px", borderRadius: "6px", fontWeight: "600", fontSize: "0.85rem", whiteSpace: "nowrap" }}>Xem vị trí</button>{canManagePoints && (<><button onClick={() => openEditModal(point)} style={{ cursor: "pointer", border: "1px solid #f59e0b", background: "white", color: "#f59e0b", padding: "6px 12px", borderRadius: "6px", fontWeight: "600", fontSize: "0.85rem" }}>Sửa</button><button onClick={() => handleDeletePoint(point.id)} style={{ cursor: "pointer", border: "1px solid #ef4444", background: "white", color: "#ef4444", padding: "6px 12px", borderRadius: "6px", fontWeight: "600", fontSize: "0.85rem" }}>Xóa</button></>)}</div></td>
                    </tr>
                  )) : (<tr><td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#666", fontStyle: "italic", fontSize: "1.1rem" }}>Chưa có điểm cứu trợ nào trên hệ thống.</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <footer className="site-footer"><div className="footer-bottom"><span>© 2025 Cứu Hộ App</span><span>|</span><button onClick={() => window.scrollTo(0, 0)}>Trang chủ</button><span>|</span><button onClick={() => navigate("/map")}>Bản đồ</button></div></footer>
      
      {showAddPointModal && <Modal title={editingPoint ? "Cập nhật Điểm" : "Thêm Điểm Mới"} onClose={() => setShowAddPointModal(false)}><div className="form-group"><label>Tên điểm <span style={{ color: "red" }}>*</span></label><input type="text" value={newPointName} onChange={(e) => setNewPointName(e.target.value)} style={{ width: "100%", padding: "10px" }} /></div><div className="form-group" ref={pointWrapperRef}><label>Địa chỉ <span style={{ color: "red" }}>*</span></label><div className="address-input-container"><input type="text" value={newPointAddress} onChange={handlePointAddressChange} onFocus={() => newPointAddress && setActiveAutocomplete("point") && setShowSuggestions(true)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #007bff" }} autoComplete="off" />{showSuggestions && activeAutocomplete === "point" && suggestions.length > 0 && (<div className="suggestions-dropdown">{suggestions.map((item, index) => (<div key={index} className="suggestion-item" onClick={() => handleSelectSuggestion(item)}><span style={{ fontSize: "1.2rem" }}>📍</span><span className="suggestion-text">{item.display_name}</span></div>))}</div>)}</div></div><div className="form-group"><label>Loại hình</label><input type="text" value={newPointType} onChange={(e) => setNewPointType(e.target.value)} style={{ width: "100%", padding: "10px" }} /></div><div className="form-group"><label>Trạng thái</label><select value={newPointStatus} onChange={(e) => setNewPointStatus(e.target.value)} style={{ width: "100%", padding: "10px" }}><option value="Active">Đang hoạt động</option><option value="Inactive">Tạm ngưng</option><option value="Full">Đầy chỗ</option></select></div><div style={{ display: "flex", gap: "10px", marginTop: "10px" }}><button className="btn-primary" onClick={handleSavePoint} style={{ backgroundColor: "#15803d", flex: 1 }}>{editingPoint ? "Lưu" : "Thêm"}</button><button onClick={() => { setShowAddPointModal(false); resetPointForm(); }} style={{ backgroundColor: "#666", color: "white", padding: "10px", borderRadius: "5px", border: "none" }}>Hủy</button></div></Modal>}
      
      {showRequestForm && <Modal title="Gửi yêu cầu khẩn cấp" onClose={() => setShowRequestForm(false)}><div className="form-group"><label>Bạn cần giúp gì?</label><select value={reqType} onChange={(e) => setReqType(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}><option>Cần lương thực</option><option>Cần thuốc men / Y tế</option><option>Cần sơ tán khẩn cấp</option><option>Cần áo phao / Thuyền</option><option>Khác</option></select></div><div className="form-group" ref={wrapperRef}><label>Địa chỉ <span style={{ color: "red" }}>*</span></label><div className="address-input-container"><input type="text" value={reqAddress} onChange={handleReqAddressChange} onFocus={() => reqAddress && setActiveAutocomplete("sos") && setShowSuggestions(true)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #007bff" }} autoComplete="off" />{showSuggestions && activeAutocomplete === "sos" && suggestions.length > 0 && (<div className="suggestions-dropdown">{suggestions.map((item, index) => (<div key={index} className="suggestion-item" onClick={() => handleSelectSuggestion(item)}><span style={{ fontSize: "1.2rem" }}>📍</span><span className="suggestion-text">{item.display_name}</span></div>))}</div>)}</div></div><div className="form-group"><label>Mô tả</label><textarea value={reqDesc} onChange={(e) => setReqDesc(e.target.value)} style={{ width: "100%", padding: "10px" }} /></div><button className="btn-primary" style={{ backgroundColor: "#dc2626", marginTop: "10px" }} onClick={handleCreateRequest} disabled={isSubmitting}>Gửi</button></Modal>}
    </div>
  );
};

export default HomePage;