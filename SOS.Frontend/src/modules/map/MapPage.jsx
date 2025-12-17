// src/modules/map/MapPage.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import { useNavigate, useLocation } from "react-router-dom";
import L from "leaflet";
import axios from "axios"; 
import Modal from "../../components/Modal";
import "./MapPage.css";

// --- CẤU HÌNH ICON (GIỮ NGUYÊN) ---
const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const blueIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const VIETNAM_BOUNDS = [[5.0, 101.0], [24.0, 118.0]];

function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

const MapPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- REFS ---
  const mapRef = useRef(null);
  const routingControlRef = useRef(null);

  // --- STATES ---
  const [currentUser, setCurrentUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [reliefPoints, setReliefPoints] = useState([]);

  // Form & UI States
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqType, setReqType] = useState("Cần lương thực");
  const [reqDesc, setReqDesc] = useState("");
  const [provinces, setProvinces] = useState([]);
  const [currentProvince, setCurrentProvince] = useState(null);
  const [showLocaDropdown, setShowLocaDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [requestToCancel, setRequestToCancel] = useState(null);
  const [showUpdateAddressModal, setShowUpdateAddressModal] = useState(false);
  const [newAddressInput, setNewAddressInput] = useState("");
  const [manualPosition, setManualPosition] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  const MapRefHandler = () => {
    const map = useMap();
    useEffect(() => { mapRef.current = map; }, [map]);
    return null;
  };

  // --- [UPDATE] LOAD USER & REPORTS TỪ API ---
  useEffect(() => {
    const initMapData = async () => {
      // 1. Lấy thông tin cơ bản từ LocalStorage (để có ID)
      const storedUser = localStorage.getItem("currentUser");
      let localData = storedUser ? JSON.parse(storedUser) : null;

      if (localData && (localData.id || localData.userId)) {
        try {
          const userId = localData.id || localData.userId;
          const API_BASE = "http://localhost:5075/api";

          // 2. Gọi API lấy thông tin mới nhất từ Database
          const res = await axios.get(`${API_BASE}/user/${userId}/get-user-by-id`);
          let freshUser = res.data.user || res.data;

          console.log("📥 Dữ liệu từ DB:", freshUser);

          // 3. TỰ ĐỘNG CHUYỂN ĐỔI ĐỊA CHỈ -> TỌA ĐỘ (GEOCODING)
          if (freshUser.address) {
             try {
                 const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(freshUser.address)}&limit=1`);
                 const geoData = await geoRes.json();
                 
                 if (geoData && geoData.length > 0) {
                     freshUser.location = [parseFloat(geoData[0].lat), parseFloat(geoData[0].lon)];
                     console.log("📍 Đã tìm thấy tọa độ:", freshUser.location);
                 }
             } catch (geoErr) {
                 console.error("Lỗi chuyển đổi địa chỉ:", geoErr);
             }
          }

          if (localData.token) freshUser.token = localData.token;
          setCurrentUser(freshUser);
          localStorage.setItem("currentUser", JSON.stringify(freshUser));

        } catch (err) {
          console.error("Lỗi tải thông tin user:", err);
          setCurrentUser(localData);
        }
      }
      
      // --- [MỚI] LOAD YÊU CẦU CỨU TRỢ TỪ API ---
      try {
        const API_BASE = "http://localhost:5075/api";
        
        // Gọi API lấy đơn đã duyệt (Accepted) và đang cứu (InProcess)
        const [resAccepted, resInProcess] = await Promise.all([
            axios.get(`${API_BASE}/reports/status/Accepted`).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/InProcess`).catch(() => ({ data: [] }))
        ]);

        const rawReports = [...(resAccepted.data || []), ...(resInProcess.data || [])];
        console.log("📥 Đơn cứu trợ từ API:", rawReports);

        const processedReports = [];
        
        // Duyệt qua từng đơn để tìm tọa độ (Geocoding)
        for (const report of rawReports) {
            let location = null;
            if (report.address) {
                try {
                    // Gọi API bản đồ để chuyển địa chỉ thành tọa độ
                    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(report.address)}&limit=1`);
                    const geoData = await geoRes.json();
                    if (geoData && geoData.length > 0) {
                        location = [parseFloat(geoData[0].lat), parseFloat(geoData[0].lon)];
                    }
                } catch (e) { console.error("Lỗi tìm tọa độ:", report.address); }
            }

            // Chỉ hiện những đơn tìm được tọa độ
            if (location) {
                processedReports.push({
                    id: report.id,
                    userId: report.phone,
                    name: report.name,
                    phone: report.phone,
                    address: report.address,
                    location: location, // Tọa độ mới tìm được
                    type: report.level,
                    description: report.details,
                    // Map trạng thái từ Backend sang Frontend
                    status: report.status === "Accepted" ? "approved" : "in_progress",
                    rescuerName: report.rescuerName,
                    rescuerPhone: report.rescuerPhone
                });
            }
        }
        
        setRequests(processedReports);

      } catch (err) {
        console.error("Lỗi tải yêu cầu cứu trợ:", err);
      }
    };

    initMapData();
  }, []);

  // --- CÁC LOGIC KHÁC (GIỮ NGUYÊN) ---
  const handleDrawRoute = (start, end) => {
    if (!mapRef.current) return;
    if (routingControlRef.current) { try { mapRef.current.removeControl(routingControlRef.current); } catch (e) {} }
    const routingControl = L.Routing.control({
      waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
      routeWhileDragging: false, show: false, addWaypoints: false, fitSelectedRoutes: true,
      lineOptions: { styles: [{ color: "#6FA1EC", weight: 6 }] },
      router: L.Routing.osrmv1({ serviceUrl: `https://router.project-osrm.org/route/v1` }),
    }).addTo(mapRef.current);
    routingControlRef.current = routingControl;
  };

  useEffect(() => {
    const fetchApiProvinces = async () => {
      try {
        const res = await fetch("https://provinces.open-api.vn/api/v2/?depth=1");
        setProvinces(await res.json());
      } catch (error) { console.error("Lỗi API Tỉnh thành: ", error); }
    };
    fetchApiProvinces();
  }, []);

  useEffect(() => {
    const fetchReliefPoints = async () => {
      const storedPoints = localStorage.getItem("RELIEF_POINTS");
      if (storedPoints) {
        const points = JSON.parse(storedPoints);
        const pointsWithCoords = await Promise.all(
          points.map(async (p) => {
            if (!p.location && p.address) {
              try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(p.address)}&limit=1`);
                const data = await res.json();
                if (data && data.length > 0) {
                  return { ...p, location: [parseFloat(data[0].lat), parseFloat(data[0].lon)] };
                }
              } catch (e) {}
            }
            return p;
          })
        );
        setReliefPoints(pointsWithCoords);
      }
    };
    fetchReliefPoints();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setShowSuggestions(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Handlers
  const filterUniqueSuggestions = (data) => {
    const seen = new Set();
    return data.filter((item) => {
      const duplicate = seen.has(item.display_name); seen.add(item.display_name); return !duplicate;
    });
  };

  const handleAddressInputChange = (e) => {
    const value = e.target.value;
    setNewAddressInput(value);
    if (!value.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=1&limit=5&countrycodes=vn`);
        const data = await res.json();
        setSuggestions(filterUniqueSuggestions(data));
        setShowSuggestions(true);
      } catch (error) {}
    }, 200);
  };

  const handleSelectSuggestion = (item) => { setNewAddressInput(item.display_name); setShowSuggestions(false); };

  const handleChooseProvince = async (province) => {
    setCurrentProvince(province); setShowLocaDropdown(false); setIsLoading(true);
    try {
      const query = `${province.name}, Việt Nam`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        navigate("/map", { state: { position: [parseFloat(data[0].lat), parseFloat(data[0].lon)], name: province.name } });
      } else { navigate("/map", { state: { name: province.name } }); }
    } catch (error) { navigate("/map"); } finally { setIsLoading(false); }
  };

  const handleUpdateAddress = async () => {
    if (!newAddressInput.trim()) { alert("Vui lòng nhập địa chỉ bạn đang ở!"); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newAddressInput)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const newCoords = [lat, lon];
        const newAddressText = data[0].display_name;

        // Lưu xuống Backend
        const API_BASE = "http://localhost:5075/api";
        const userId = currentUser.id || currentUser.userId;
        if (userId) {
            await axios.post(`${API_BASE}/user/${userId}/address`, JSON.stringify(newAddressText), {
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem("accessToken")}` }
            });
        }

        const updatedUser = { ...currentUser, address: newAddressText, location: newCoords };
        setCurrentUser(updatedUser);
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        setManualPosition(newCoords);

        alert("Đã cập nhật vị trí thành công!");
        setShowUpdateAddressModal(false); setNewAddressInput("");
      } else { alert("❌ Không tìm thấy địa chỉ này trên bản đồ!"); }
    } catch (error) { console.error(error); alert("Lỗi kết nối bản đồ."); } finally { setIsLoading(false); }
  };

  const handleCreateRequest = async () => {
    // 1. Validate dữ liệu
    if (!currentUser) { 
      alert("Vui lòng đăng nhập."); 
      return; 
    }
    if (!currentUser.address) { 
      alert("Vui lòng cập nhật vị trí/địa chỉ của bạn trước khi gửi yêu cầu."); 
      return; 
    }

    setIsLoading(true);

    try {
      const API_BASE = "http://localhost:5075/api";
      
      // 2. Chuẩn bị dữ liệu gửi lên
      const payload = {
        phone: currentUser.phone,
        name: currentUser.fullName || currentUser.name,
        address: currentUser.address,
        details: reqDesc, 
        level: reqType 
      };

      // 3. Gọi API
      await axios.post(`${API_BASE}/reports`, payload, { 
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem("accessToken")}` } 
      });

      alert("✅ Đã gửi tín hiệu SOS thành công!");
      
      // Tải lại danh sách từ API để hiện Marker ngay nếu backend xử lý nhanh
      // Hoặc có thể thêm tạm vào state 'requests'
      setShowRequestForm(false);
      setReqDesc("");

    } catch (error) {
      console.error("Lỗi tạo yêu cầu:", error);
      alert("❌ Gửi yêu cầu thất bại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitizenCancelRequest = (req) => {
    const confirm = window.confirm("Bạn đã an toàn và muốn hủy yêu cầu cứu trợ này?");
    if (!confirm) return;
    const updatedRequests = requests.map((r) => r.id === req.id ? { ...r, status: "canceled" } : r);
    setRequests(updatedRequests);
    localStorage.setItem("RELIEF_REQUESTS", JSON.stringify(updatedRequests));
    alert("Đã hủy yêu cầu thành công!");
  };

  const handleAcceptSupport = (request) => {
    if (!currentUser || currentUser.role !== "volunteer") return;
    if (!currentUser.location) { alert("Bạn cần cập nhật vị trí của mình trước khi nhận nhiệm vụ!"); setNewAddressInput(currentUser.address || ""); setShowUpdateAddressModal(true); return; }
    const confirm = window.confirm(`Bạn có chắc chắn muốn nhận cứu trợ cho ${request.name}?`);
    if (!confirm) return;
    const updatedRequests = requests.map((r) => r.id === request.id ? { ...r, status: "in_progress", rescuerName: currentUser.fullName || currentUser.name, rescuerPhone: currentUser.phone, rescuerLocation: currentUser.location } : r);
    setRequests(updatedRequests);
    localStorage.setItem("RELIEF_REQUESTS", JSON.stringify(updatedRequests));
    alert("Đã nhận nhiệm vụ! Hãy di chuyển đến vị trí người bị nạn.");
    handleDrawRoute(currentUser.location, request.location);
  };

  const handleCompleteSupport = (request) => {
    const confirm = window.confirm("Xác nhận đã cứu trợ thành công?");
    if (!confirm) return;
    const updatedRequests = requests.map((r) => r.id === request.id ? { ...r, status: "completed" } : r);
    setRequests(updatedRequests);
    localStorage.setItem("RELIEF_REQUESTS", JSON.stringify(updatedRequests));
    alert("Cảm ơn bạn! Yêu cầu đã hoàn tất.");
    if (routingControlRef.current && mapRef.current) { try { mapRef.current.removeControl(routingControlRef.current); routingControlRef.current = null; } catch (e) {} }
  };

  const handleTriggerCancel = (request) => { setRequestToCancel(request); setCancelReason(""); setShowCancelModal(true); };
  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) { alert("Vui lòng nhập lý do hủy!"); return; }
    const updatedRequests = requests.map((r) => r.id === requestToCancel.id ? { ...r, status: "cancel_pending", cancelReason: cancelReason } : r);
    setRequests(updatedRequests);
    localStorage.setItem("RELIEF_REQUESTS", JSON.stringify(updatedRequests));
    alert("Đã gửi yêu cầu hủy! Vui lòng chờ Admin phê duyệt.");
    setShowCancelModal(false); setRequestToCancel(null);
  };

  const defaultPosition = [21.0285, 105.8542];
  const centerPosition = currentUser?.location || defaultPosition;
  const incomingPosition = location.state?.position;
  const incomingName = location.state?.name;
  const effectiveCenter = manualPosition || incomingPosition || centerPosition;
  const isCitizenFunc = currentUser?.role === "citizen" || currentUser?.role === "volunteer-pending";
  const isVolunteerFunc = currentUser?.role === "volunteer";

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <button onClick={() => navigate("/home")} style={{ position: "absolute", top: "20px", left: "60px", zIndex: 1000, padding: "10px 20px", backgroundColor: "white", border: "none", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", cursor: "pointer", fontWeight: "bold", color: "#333", display: "flex", alignItems: "center", gap: "5px" }}><span>⬅</span> Quay lại</button>
      {currentUser?.role === "volunteer-pending" && <div style={{ position: "absolute", top: 0, left: 0, width: "100%", background: "rgba(255, 165, 0, 0.9)", color: "white", textAlign: "center", padding: "5px", zIndex: 2000, fontWeight: "bold" }}>⚠️ Tài khoản Tình nguyện viên đang chờ duyệt.</div>}
      {currentUser && (
        <div className="lst-btn-rescuee" style={{ position: "absolute", top: "20px", left: "200px", zIndex: 1000, display: "flex", gap: "10px" }}>
          {isCitizenFunc && <button onClick={() => setShowRequestForm(true)} style={{ padding: "10px 20px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px" }}><span>🆘</span> Gửi tín hiệu SOS</button>}
          <button onClick={() => { setNewAddressInput(currentUser?.address || ""); setShowUpdateAddressModal(true); }} style={{ padding: "10px 12px", backgroundColor: "white", color: "#333", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}><span>📍</span> Sửa địa chỉ</button>
        </div>
      )}
      <div className="box-location" style={{ position: "absolute", bottom: "30px", left: "20px", zIndex: 1000 }}>
        <div className="location-badge bottom" onClick={() => setShowLocaDropdown(!showLocaDropdown)}>{currentProvince ? currentProvince.name : "Chọn tỉnh"} ▴</div>
        {showLocaDropdown && <div className="lst-provinces-drop" style={{ top: "auto", bottom: "20px", marginBottom: "10px" }}>{provinces.length > 0 ? provinces.map((prov) => (<div key={prov.code} onClick={() => handleChooseProvince(prov)} className="imt-provinces">{prov.name}</div>)) : <div className="imt-provinces">Đang tải...</div>}</div>}
      </div>
      <MapContainer key={JSON.stringify(effectiveCenter)} center={effectiveCenter} zoom={14} scrollWheelZoom={true} minZoom={6} maxBounds={VIETNAM_BOUNDS} style={{ width: "100%", height: "100%" }}>
        <MapRefHandler /> <ChangeView center={effectiveCenter} zoom={14} />
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {currentUser && currentUser.location && <Marker position={currentUser.location} icon={isVolunteerFunc ? blueIcon : redIcon} opacity={0.6} zIndexOffset={-100}><Popup>Vị trí của bạn</Popup></Marker>}
        {requests.map((req) => {
          if (req.status !== "approved" && req.status !== "in_progress" && req.status !== "cancel_pending") return null;
          return (
            <React.Fragment key={req.id}>
              <Marker position={req.location} icon={redIcon} zIndexOffset={1000}><Tooltip direction="top" offset={[0, -40]} opacity={1}><span>🆘 {req.name}</span></Tooltip><Popup><strong>{req.name}</strong><br/>SĐT: <a href={`tel:${req.phone}`}>{req.phone}</a><hr style={{ margin: "5px 0" }}/>Lý do: <span style={{ color: "#d9534f", fontWeight: "bold" }}>{req.type}</span><br/>Chi tiết: {req.description}<br/>Địa chỉ: {req.address}<br/>{currentUser && currentUser.role === "citizen" && currentUser.phone === req.userId && (<button onClick={() => handleCitizenCancelRequest(req)} style={{ marginTop: "10px", width: "100%", padding: "5px", background: "#10b981", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" }}>✅ Tôi đã an toàn</button>)}{isVolunteerFunc && (<div style={{ marginTop: "10px", textAlign: "center" }}>{req.status === "approved" && (<button onClick={() => handleAcceptSupport(req)} style={{ background: "#007bff", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", width: "100%" }}>✋ Tôi sẽ cứu</button>)}{req.status === "in_progress" && req.rescuerPhone === currentUser.phone && (<div style={{ background: "#d1fae5", padding: "5px", borderRadius: "4px" }}><p style={{ margin: "0 0 5px 0", color: "#065f46", fontSize: "0.85rem" }}>Đang thực hiện...</p><button onClick={() => handleDrawRoute(currentUser.location, req.location)} style={{ background: "#3b82f6", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", width: "100%", marginBottom: "5px" }}>🗺️ Dẫn đường</button><button onClick={() => handleCompleteSupport(req)} style={{ background: "#059669", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", width: "100%" }}>✅ Đã xong</button><button onClick={() => handleTriggerCancel(req)} style={{ background: "#dc2626", marginTop: "8px", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", width: "100%" }}>❌ Hủy nhận</button></div>)}{(req.status === "in_progress" || req.status === "cancel_pending") && req.rescuerPhone !== currentUser.phone && (<p style={{ color: "#9333ea", fontStyle: "italic", fontWeight: "bold" }}>⚠️ Đã có người khác nhận</p>)}</div>)}</Popup></Marker>
              {(req.status === "in_progress" || req.status === "cancel_pending") && req.rescuerLocation && <Marker position={req.rescuerLocation} icon={blueIcon} zIndexOffset={900}><Tooltip direction="top" offset={[0, -40]} opacity={1}><span>🚑 {req.rescuerName}</span></Tooltip><Popup><strong>🚑 {req.rescuerName}</strong><br/>📞 {req.rescuerPhone}<br/><em style={{ color: "green" }}>Đang di chuyển</em></Popup></Marker>}
            </React.Fragment>
          );
        })}
        {reliefPoints.map((point) => { if (!point.location) return null; return (<Marker key={`point-${point.id}`} position={point.location} icon={greenIcon} zIndexOffset={800}><Tooltip direction="top" offset={[0, -40]} opacity={1}><span>⛺ {point.name}</span></Tooltip><Popup><strong>{point.name}</strong><br/>📍 {point.address}<hr style={{ margin: "5px 0" }}/>📦 Hỗ trợ: {point.type}<br/><span style={{ color: point.status === "Đang hoạt động" ? "green" : "red", fontWeight: "bold" }}>● {point.status}</span></Popup></Marker>); })}
        {incomingPosition && JSON.stringify(incomingPosition) !== JSON.stringify(currentUser?.location) && <Marker position={incomingPosition} icon={blueIcon}><Popup>Vị trí tìm kiếm:<br/><strong>{incomingName}</strong></Popup></Marker>}
      </MapContainer>
      {showRequestForm && <Modal title="Gửi yêu cầu khẩn cấp" onClose={() => setShowRequestForm(false)}><div className="form-group"><label>Bạn cần giúp gì?</label><select value={reqType} onChange={(e) => setReqType(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}><option>Cần lương thực</option><option>Cần thuốc men / Y tế</option><option>Cần sơ tán khẩn cấp</option><option>Cần áo phao / Thuyền</option><option>Khác</option></select></div><div className="form-group"><label>Mô tả chi tiết</label><textarea rows="4" placeholder="Mô tả tình trạng..." value={reqDesc} onChange={(e) => setReqDesc(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}/></div><button className="btn-primary" style={{ backgroundColor: "#dc2626" }} onClick={handleCreateRequest}>Gửi Yêu Cầu</button></Modal>}
      {showCancelModal && <Modal title="Lý do hủy nhiệm vụ" onClose={() => setShowCancelModal(false)}><div className="form-group"><label>Tại sao bạn muốn hủy cứu trợ này?</label><textarea rows="3" placeholder="Nhập lý do..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}/></div><button onClick={handleConfirmCancel} className="btn-primary" style={{ backgroundColor: "#dc2626", marginTop: "10px" }}>Xác nhận Hủy</button></Modal>}
      {showUpdateAddressModal && (
        <Modal title="Cập nhật Vị trí Hiện tại" onClose={() => setShowUpdateAddressModal(false)}>
          <p style={{ color: "#dc2626", marginBottom: "10px" }}>⚠️ <strong>Lưu ý:</strong> Nhập địa chỉ chi tiết để định vị chính xác!</p>
          <div className="form-group" ref={wrapperRef}><label>Địa chỉ hiện tại của bạn:</label><div className="address-input-container"><input type="text" placeholder="Nhập địa chỉ..." value={newAddressInput} onChange={handleAddressInputChange} onFocus={() => newAddressInput && setShowSuggestions(true)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }} autoComplete="off"/>{showSuggestions && suggestions.length > 0 && (<div className="suggestions-dropdown">{suggestions.map((item, index) => (<div key={index} className="suggestion-item" onClick={() => handleSelectSuggestion(item)}><span style={{ fontSize: "1.2rem" }}>📍</span><span className="suggestion-text">{item.display_name}</span></div>))}</div>)}</div></div>
          <button onClick={handleUpdateAddress} className="btn-primary" disabled={isLoading} style={{ backgroundColor: "#007bff", marginTop: "10px" }}>{isLoading ? "Đang định vị..." : "Cập nhật Vị trí"}</button>
        </Modal>
      )}
    </div>
  );
};

export default MapPage;