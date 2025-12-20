// src/modules/map/MapPage.jsx
import axios from "axios";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import "leaflet/dist/leaflet.css";
import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import { useLocation, useNavigate } from "react-router-dom";
import Modal from "../../components/Modal";
import "./MapPage.css";

// --- CẤU HÌNH ICON ---
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

// --- COMPONENT LOADING SPINNER ---
const LoadingOverlay = () => (
  <div style={{
    position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.8)", zIndex: 9999,
    display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column"
  }}>
    <div className="spinner" style={{
      width: "50px", height: "50px", border: "5px solid #f3f3f3",
      borderTop: "5px solid #3498db", borderRadius: "50%",
      animation: "spin 1s linear infinite"
    }}></div>
    <h3 style={{ marginTop: "15px", color: "#333" }}>Đang xử lý dữ liệu...</h3>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

// Component để di chuyển map mượt mà
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom); 
    }
  }, [center, zoom, map]);
  return null;
}

const MapPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- REFS ---
  const mapRef = useRef(null);
  const routingControlRef = useRef(null);

  // --- STATES ---
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("currentUser");
    return saved ? JSON.parse(saved) : null;
  });

  const [requests, setRequests] = useState(() => {
    const saved = localStorage.getItem("RELIEF_REQUESTS_STATE");
    return saved ? JSON.parse(saved) : [];
  });

  const [reliefPoints, setReliefPoints] = useState(() => {
    const saved = localStorage.getItem("RELIEF_POINTS");
    return saved ? JSON.parse(saved) : [];
  });

  // [MỚI] State quản lý ẩn hiện điểm an toàn
  const [showReliefPoints, setShowReliefPoints] = useState(false);

  const [manualPosition, setManualPosition] = useState(() => {
      const saved = localStorage.getItem("MANUAL_POSITION");
      return saved ? JSON.parse(saved) : null;
  });

  // Form & UI States
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqType, setReqType] = useState("Cần lương thực");
  const [reqDesc, setReqDesc] = useState("");
  const [provinces, setProvinces] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true); 
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [requestToCancel, setRequestToCancel] = useState(null);
  const [showUpdateAddressModal, setShowUpdateAddressModal] = useState(false);
  const [newAddressInput, setNewAddressInput] = useState("");
  
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  const MapRefHandler = () => {
    const map = useMap();
    useEffect(() => { mapRef.current = map; }, [map]);
    return null;
  };

  // --- [MỚI] KIỂM TRA ĐIỀU HƯỚNG TỪ HOME PAGE ---
  useEffect(() => {
    // Nếu có location.state (tức là bấm "Xem vị trí" từ HomePage), thì hiện điểm an toàn
    if (location.state && location.state.position) {
        setShowReliefPoints(true);
    } else {
        // Nếu vào trực tiếp Map (từ menu), ẩn đi
        setShowReliefPoints(false);
    }
  }, [location.state]);

  // Hàm vẽ đường
  const drawRoute = (start, end) => {
    if (!mapRef.current) return;
    if (routingControlRef.current) { 
        try { mapRef.current.removeControl(routingControlRef.current); } catch (e) {} 
    }
    const routingControl = L.Routing.control({
      waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
      routeWhileDragging: false, show: false, addWaypoints: false, fitSelectedRoutes: true,
      lineOptions: { styles: [{ color: "#6FA1EC", weight: 6 }] },
      router: L.Routing.osrmv1({ serviceUrl: `https://router.project-osrm.org/route/v1` }),
    }).addTo(mapRef.current);
    routingControlRef.current = routingControl;
  };

  // --- HELPER: XỬ LÝ TRÙNG VỊ TRÍ (OFFSET MARKER) ---
  const getDisplayPosition = (targetLoc, userLoc) => {
    if (!targetLoc || !userLoc) return targetLoc;
    const EPSILON = 0.00001; 
    const OFFSET = 0.00015; // ~15m

    const latDiff = Math.abs(targetLoc[0] - userLoc[0]);
    const lngDiff = Math.abs(targetLoc[1] - userLoc[1]);

    // Nếu trùng vị trí, dịch chuyển nhẹ
    if (latDiff < EPSILON && lngDiff < EPSILON) {
        return [targetLoc[0] + OFFSET, targetLoc[1] + OFFSET];
    }
    return targetLoc;
  };

  // --- 1. [TỐI ƯU HÓA] LOAD USER & REPORTS & TASKS SONG SONG ---
  useEffect(() => {
    const initMapData = async () => {
      setIsLoading(true);
      console.log("🚀 Bắt đầu initMapData (Optimized)...");
      
      const API_BASE = "http://localhost:5075/api";
      
      let freshUser = currentUser;
      if (currentUser && (currentUser.id || currentUser.userId)) {
        try {
          const userId = currentUser.id || currentUser.userId;
          const res = await axios.get(`${API_BASE}/user/${userId}/get-user-by-id`);
          freshUser = res.data.user || res.data;
          
          if (freshUser.address && (!freshUser.location || freshUser.location.length === 0)) {
             try {
                 const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(freshUser.address)}&limit=1`);
                 const geoData = await geoRes.json();
                 if (geoData && geoData.length > 0) {
                     freshUser.location = [parseFloat(geoData[0].lat), parseFloat(geoData[0].lon)];
                 }
             } catch (geoErr) {}
          }
          if (currentUser.token) freshUser.token = currentUser.token;
          setCurrentUser(freshUser);
          localStorage.setItem("currentUser", JSON.stringify(freshUser));
        } catch (err) {}
      }

      try {
        console.log("📡 Đang gọi API Reports...");
        const [resAccepted, resInProcess, resCancelPending, resPending] = await Promise.all([
            axios.get(`${API_BASE}/reports/status/Accepted`).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/InProcess`).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/CancelPending`).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/Pending`).catch(() => ({ data: [] }))
        ]);

        const rawReports = [
            ...(resAccepted.data || []), 
            ...(resInProcess.data || []),
            ...(resCancelPending.data || []),
            ...(resPending.data || [])
        ];
        
        console.log(`✅ Đã tải ${rawReports.length} reports.`);

        const reportPromises = rawReports.map(async (report) => {
            if (report.status === "Completed") return null;

            const reportId = report.reportId || report.id;
            let task = null;
            let location = null;

            const [taskRes, geoData] = await Promise.all([
                axios.get(`${API_BASE}/reports/tasks/gettask/${reportId}`).catch(() => null),
                report.address ? fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(report.address)}&limit=1`).then(r => r.json()).catch(() => null) : Promise.resolve(null)
            ]);

            if (taskRes && taskRes.data) {
                if (Array.isArray(taskRes.data) && taskRes.data.length > 0) task = taskRes.data[0];
                else if (!Array.isArray(taskRes.data)) task = taskRes.data;
            }

            if (geoData && geoData.length > 0) {
                location = [parseFloat(geoData[0].lat), parseFloat(geoData[0].lon)];
            }

            if (!location) return null;

            let displayStatus = report.status ? report.status.toLowerCase() : "pending";
            let rescuerName = null;
            let rescuerPhone = null;
            let rescuerLocation = null;
            let taskId = null;
            let rescuerId = null;
            let cancelReason = null;

            if (task && task.id) {
                taskId = task.id;
                if (task.status === "in_progress") displayStatus = "in_progress";
                if (task.status === "pending_to_cancel") {
                    displayStatus = "pending-to-cancel";
                    cancelReason = task.note || "Đang chờ duyệt hủy";
                }
                if (task.status === "completed") return null;

                rescuerId = task.volunteerId;
                rescuerName = task.volunteerName;
                rescuerLocation = task.volunteerLocation;
                rescuerPhone = task.volunteerPhone; 
                
                if (freshUser && (freshUser.id === rescuerId || freshUser.userId === rescuerId)) {
                    if (!rescuerPhone) rescuerPhone = freshUser.phone;
                }
            }

            return {
                id: reportId, reportId, taskId,
                name: report.name, phone: report.phone, address: report.address, location,
                type: report.level, description: report.details,
                status: displayStatus, 
                rescuerId, rescuerName, rescuerPhone, rescuerLocation, cancelReason
            };
        });

        const processedResults = await Promise.all(reportPromises);
        const finalReports = processedResults.filter(r => r !== null);

        setRequests(finalReports);
        localStorage.setItem("RELIEF_REQUESTS_STATE", JSON.stringify(finalReports));

      } catch (err) {
        console.error("❌ Lỗi trong initMapData:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initMapData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- LOGIC LOAD RELIEF POINTS ---
  useEffect(() => {
    const fetchReliefPoints = async () => {
        try {
            const API_BASE = "http://localhost:5075/api";
            const [resActive, resInactive, resFull] = await Promise.all([
                axios.get(`${API_BASE}/safety/get-by-status/Active`).catch(() => ({ data: [] })),
                axios.get(`${API_BASE}/safety/get-by-status/Inactive`).catch(() => ({ data: [] })),
                axios.get(`${API_BASE}/safety/get-by-status/Full`).catch(() => ({ data: [] }))
            ]);

            const allPointsData = [...(resActive.data || []), ...(resInactive.data || []), ...(resFull.data || [])];

            const pointsWithCoords = await Promise.all(
                allPointsData.map(async (p) => {
                    if (!p.location && p.address) {
                        try {
                            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(p.address)}&limit=1`);
                            const data = await res.json();
                            if (data && data.length > 0) return { ...p, location: [parseFloat(data[0].lat), parseFloat(data[0].lon)] };
                        } catch (e) {}
                    } else if (p.latitude && p.longitude) {
                        return { ...p, location: [p.latitude, p.longitude] };
                    }
                    return p;
                })
            );
            
            setReliefPoints(pointsWithCoords);
            localStorage.setItem("RELIEF_POINTS", JSON.stringify(pointsWithCoords));
        } catch (e) {
            console.error("Lỗi fetch relief points:", e);
        }
    };
    fetchReliefPoints();
  }, []);

  // --- TỰ ĐỘNG VẼ LẠI ROUTE ---
  useEffect(() => {
    if (!currentUser || !mapRef.current || requests.length === 0) return;
    const currentUserId = currentUser.id || currentUser.userId;
    const myActiveTask = requests.find(r => 
        r.status === 'in_progress' && 
        ((r.rescuerId && r.rescuerId === currentUserId) || (r.rescuerPhone === currentUser.phone))
    );
    if (myActiveTask && currentUser.location && myActiveTask.location) {
        setTimeout(() => { drawRoute(currentUser.location, myActiveTask.location); }, 500);
    }
  }, [requests, currentUser]);

  // --- LOAD PROVINCES ---
  useEffect(() => {
    const fetchApiProvinces = async () => {
      try {
        const res = await fetch("https://provinces.open-api.vn/api/v2/?depth=1");
        setProvinces(await res.json());
      } catch (error) {}
    };
    fetchApiProvinces();
  }, []);

  // --- HANDLERS (Giữ nguyên) ---
  const handleAcceptSupport = async (request) => {
    if (!currentUser || currentUser.role !== "volunteer") return;
    if (!currentUser.location) {
      alert("Bạn cần cập nhật vị trí của mình trước khi nhận nhiệm vụ!");
      setNewAddressInput(currentUser.address || "");
      setShowUpdateAddressModal(true);
      return;
    }
    const confirm = window.confirm(`Bạn có chắc chắn muốn nhận cứu trợ cho ${request.name}?`);
    if (!confirm) return;

    setIsLoading(true);
    try {
      const API_BASE = "http://localhost:5075/api";
      const volunteerId = currentUser.id || currentUser.userId;

      const res = await axios.post(
        `${API_BASE}/reports/${request.reportId}/accept`,
        { volunteerId, note: "Tôi sẽ đến cứu ngay" }
      );

      const newRequests = requests.map((r) => {
        if (r.reportId === request.reportId) {
          return {
            ...r, 
            taskId: res.data.taskId, 
            status: "in_progress",
            rescuerId: volunteerId,
            rescuerName: currentUser.fullName || currentUser.name,
            rescuerPhone: currentUser.phone, 
            rescuerLocation: currentUser.location,
          };
        }
        return r;
      });

      setRequests(newRequests);
      localStorage.setItem("RELIEF_REQUESTS_STATE", JSON.stringify(newRequests));

      alert("Đã nhận nhiệm vụ thành công!");
      drawRoute(currentUser.location, request.location);
    } catch (error) {
      console.error("Lỗi:", error);
      alert("Có lỗi xảy ra khi nhận nhiệm vụ.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSupport = async (request) => {
    const confirm = window.confirm("Xác nhận đã cứu trợ thành công?");
    if (!confirm) return;
    setIsLoading(true);
    try {
        const API_BASE = "http://localhost:5075/api";
        const volunteerId = currentUser.id || currentUser.userId;
        if (!request.taskId) { alert("Lỗi: Không tìm thấy TaskId."); setIsLoading(false); return; }
        
        await axios.post(`${API_BASE}/reports/tasks/${request.taskId}/done`, { volunteerId, note: "Hoàn thành cứu trợ" });
        
        const updatedRequests = requests.filter((r) => r.reportId !== request.reportId);
        setRequests(updatedRequests);
        localStorage.setItem("RELIEF_REQUESTS_STATE", JSON.stringify(updatedRequests));
        
        alert("Cảm ơn bạn! Yêu cầu đã hoàn tất.");
        if (routingControlRef.current && mapRef.current) { try { mapRef.current.removeControl(routingControlRef.current); routingControlRef.current = null; } catch (e) {} }
    } catch (error) { console.error("Lỗi:", error); alert("Có lỗi xảy ra."); } finally { setIsLoading(false); }
  };

  const handleTriggerCancel = (request) => { setRequestToCancel(request); setCancelReason(""); setShowCancelModal(true); };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) { alert("Vui lòng nhập lý do hủy!"); return; }
    setIsLoading(true);
    try {
        const API_BASE = "http://localhost:5075/api";
        const volunteerId = currentUser.id || currentUser.userId;
        if (!requestToCancel?.taskId) { alert("Lỗi: Không tìm thấy TaskId."); setIsLoading(false); return; }
        
        await axios.post(`${API_BASE}/reports/tasks/${requestToCancel.taskId}/request-cancel`, { volunteerId, note: cancelReason });
        
        const updatedRequests = requests.map((r) => r.reportId === requestToCancel.reportId ? { ...r, status: "pending-to-cancel", cancelReason: cancelReason } : r);
        setRequests(updatedRequests);
        localStorage.setItem("RELIEF_REQUESTS_STATE", JSON.stringify(updatedRequests));
        
        alert("Đã gửi yêu cầu hủy! Vui lòng chờ Admin phê duyệt.");
        setShowCancelModal(false); setRequestToCancel(null);
    } catch (error) { console.error("Lỗi:", error); alert("Gửi yêu cầu hủy thất bại."); } finally { setIsLoading(false); }
  };

  const handleAddressInputChange = (e) => { setNewAddressInput(e.target.value); };
  const handleSearchAddress = async () => {
    const value = newAddressInput.trim();
    if (!value || value.length < 5) return;
    try {
      setIsLoading(true);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=1&limit=5&countrycodes=vn`);
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };
  const handleKeyDown = (e) => { if (e.key === "Enter") { e.preventDefault(); handleSearchAddress(); } };
  const handleSelectSuggestion = (item) => { setNewAddressInput(item.display_name); setShowSuggestions(false); };
  
  const handleUpdateAddress = async () => {
    if (!newAddressInput.trim()) return;
    setIsLoading(true);
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newAddressInput)}&limit=1`);
      const geoData = await geoRes.json();
      if (!geoData || geoData.length === 0) { alert("Không tìm thấy vị trí"); return; }
      const newCoords = [parseFloat(geoData[0].lat), parseFloat(geoData[0].lon)];
      const displayAddress = geoData[0].display_name;
      
      await fetch(`http://localhost:5075/api/user/${currentUser.id}/address`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(displayAddress) });
      
      const updatedUser = { ...currentUser, address: displayAddress, location: newCoords };
      setCurrentUser(updatedUser);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      setManualPosition(newCoords);
      localStorage.setItem("MANUAL_POSITION", JSON.stringify(newCoords));
      alert("Đã cập nhật vị trí thành công!");
      setShowUpdateAddressModal(false);
    } catch (error) { console.error(error); alert("Có lỗi khi cập nhật địa chỉ"); } finally { setIsLoading(false); }
  };

  const handleCreateRequest = async () => { 
    if (!currentUser) { alert("Vui lòng đăng nhập."); return; }
    if (!currentUser.address) { alert("Vui lòng cập nhật vị trí/địa chỉ của bạn trước khi gửi yêu cầu."); return; }
    
    setIsLoading(true);
    try {
      const API_BASE = "http://localhost:5075/api";
      const payload = { 
        phone: currentUser.phone, 
        name: currentUser.fullName || currentUser.name, 
        address: currentUser.address, 
        details: reqDesc, 
        level: reqType 
      };
      
      const res = await axios.post(`${API_BASE}/reports`, payload, { 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem("accessToken")}` } 
      });

      alert("✅ Đã gửi tín hiệu SOS thành công! Vui lòng chờ Admin duyệt.");
      
      const newReport = {
        id: res.data.id || Date.now(), 
        reportId: res.data.id || Date.now(),
        taskId: null,
        name: currentUser.fullName || currentUser.name,
        phone: currentUser.phone,
        address: currentUser.address,
        location: currentUser.location, 
        type: reqType,
        description: reqDesc,
        status: "pending", 
        rescuerId: null,
        rescuerName: null
      };

      const updatedRequests = [...requests, newReport];
      setRequests(updatedRequests);
      localStorage.setItem("RELIEF_REQUESTS_STATE", JSON.stringify(updatedRequests));

      setShowRequestForm(false); 
      setReqDesc("");

    } catch (error) { 
      console.error("Lỗi tạo yêu cầu:", error); 
      alert("❌ Gửi yêu cầu thất bại."); 
    } finally { 
      setIsLoading(false); 
    }
  };

  // --- RENDER VARS ---
  const defaultPosition = [21.0285, 105.8542];
  const effectiveCenter = manualPosition || location.state?.position || currentUser?.location || defaultPosition;
  const isCitizenFunc = currentUser?.role === "citizen" || currentUser?.role === "volunteer-pending";
  const isVolunteerFunc = currentUser?.role === "volunteer";

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {isLoading && <LoadingOverlay />}

      <button onClick={() => navigate("/home")} style={{ position: "absolute", top: "20px", left: "60px", zIndex: 1000, padding: "10px 20px", backgroundColor: "white", border: "none", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", cursor: "pointer", fontWeight: "bold", color: "#333" }}>⬅ Quay lại</button>
      {currentUser?.role === "volunteer-pending" && <div style={{ position: "absolute", top: 0, left: 0, width: "100%", background: "rgba(255, 165, 0, 0.9)", color: "white", textAlign: "center", padding: "5px", zIndex: 2000, fontWeight: "bold" }}>⚠️ Tài khoản Tình nguyện viên đang chờ duyệt.</div>}
      
      {/* --- [MỚI] NÚT ẨN/HIỆN ĐIỂM AN TOÀN --- */}
      <button 
        onClick={() => setShowReliefPoints(!showReliefPoints)} 
        style={{
            position: "absolute", 
            bottom: "20px", 
            left: "20px", 
            zIndex: 1000, 
            padding: "10px 15px", 
            backgroundColor: showReliefPoints ? "#15803d" : "white", 
            color: showReliefPoints ? "white" : "#333",
            border: "1px solid #ddd", 
            borderRadius: "8px", 
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)", 
            cursor: "pointer", 
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "5px"
        }}
      >
        {showReliefPoints ? "👁️ Đang hiện Điểm an toàn" : "👁️‍🗨️ Hiện Điểm an toàn"}
      </button>

      {currentUser && (
        <div className="lst-btn-rescuee" style={{ position: "absolute", top: "20px", left: "200px", zIndex: 1000, display: "flex", gap: "10px" }}>
          {isCitizenFunc && <button onClick={() => setShowRequestForm(true)} style={{ padding: "10px 20px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", cursor: "pointer", fontWeight: "bold" }}>🆘 Gửi tín hiệu SOS</button>}
          <button onClick={() => { setNewAddressInput(currentUser?.address || ""); setShowUpdateAddressModal(true); }} style={{ padding: "10px 12px", backgroundColor: "white", color: "#333", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", cursor: "pointer", fontWeight: "600" }}>📍 Sửa địa chỉ</button>
        </div>
      )}

      <MapContainer center={effectiveCenter} zoom={14} scrollWheelZoom={true} minZoom={6} maxBounds={VIETNAM_BOUNDS} style={{ width: "100%", height: "100%" }}>
        <MapRefHandler /> 
        <ChangeView center={effectiveCenter} zoom={14} />
        
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {currentUser && currentUser.location && <Marker position={currentUser.location} icon={isVolunteerFunc ? blueIcon : redIcon} opacity={0.6} zIndexOffset={-100}><Popup>Vị trí của bạn</Popup></Marker>}
        
        {/* RENDER REQUESTS MARKER (Giữ nguyên) */}
        {requests.map((req) => {
            const statusLower = (req.status || "").toLowerCase();
            const isAccepted = statusLower === "accepted";
            const isInProgress = statusLower === "in_progress";
            const isPendingCancel = statusLower === "pending-to-cancel" || statusLower === "pendingtocancel";
            const isPending = statusLower === "pending"; 

            let isMyTask = false;
            if (currentUser) {
                const currentUserId = currentUser.id || currentUser.userId;
                if (req.rescuerId && currentUserId && req.rescuerId === currentUserId) isMyTask = true;
                else if (req.rescuerPhone && currentUser.phone && req.rescuerPhone === currentUser.phone) isMyTask = true;
            }

            let statusLabel = "";
            if (isAccepted) statusLabel = "Đã duyệt - Cần người cứu";
            if (isInProgress) statusLabel = isMyTask ? "Đang thực hiện (Bởi bạn)" : "Người khác đang cứu";
            if (isPendingCancel) statusLabel = "Đang chờ Admin hủy";
            if (isPending) statusLabel = "⏳ Đang chờ Admin duyệt";

            return (
            <React.Fragment key={req.reportId || req.id}>
              <Marker position={req.location} icon={redIcon} zIndexOffset={1000}>
                <Tooltip direction="top" offset={[0, -40]} opacity={1}><span>🆘 {req.name}</span></Tooltip>
                <Popup>
                  <strong>{req.name}</strong><br />
                  SĐT: <a href={`tel:${req.phone}`}>{req.phone}</a><hr style={{ margin: "5px 0" }} />
                  Lý do: <span style={{ color: "#d9534f", fontWeight: "bold" }}>{req.type}</span><br />
                  Chi tiết: {req.description}<br />
                  Địa chỉ: {req.address}<br />
                  <div style={{ marginTop: "5px", fontStyle: "italic", color: isPending ? "#d97706" : "#666" }}>
                    Trạng thái: <strong>{statusLabel}</strong>
                  </div>
                  {isPendingCancel && <div style={{color: "orange", fontSize: "0.9em"}}>Lý do hủy: {req.cancelReason}</div>}
                  {isVolunteerFunc && (
                    <div style={{ marginTop: "10px", textAlign: "center" }}>
                      {isAccepted && (
                        <button onClick={() => handleAcceptSupport(req)} style={{ background: "#007bff", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", width: "100%" }}>✋ Tôi sẽ cứu</button>
                      )}
                      {(isInProgress || isPendingCancel) && isMyTask && (
                        <div style={{ background: "#d1fae5", padding: "5px", borderRadius: "4px" }}>
                          <button onClick={() => drawRoute(currentUser.location, req.location)} style={{ background: "#3b82f6", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", width: "100%", marginBottom: "5px" }}>🗺️ Dẫn đường</button>
                          {!isPendingCancel && (
                            <>
                              <button onClick={() => handleCompleteSupport(req)} style={{ background: "#059669", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", width: "100%", marginBottom: "5px" }}>✅ Đã xong</button>
                              <button onClick={() => handleTriggerCancel(req)} style={{ background: "#dc2626", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", width: "100%" }}>❌ Hủy nhận</button>
                            </>
                          )}
                          {isPendingCancel && <div style={{fontSize: '0.8rem', color: '#d97706'}}>Đang chờ duyệt hủy...</div>}
                        </div>
                      )}
                      {isInProgress && !isMyTask && <div style={{ background: "#f3f4f6", padding: "5px", borderRadius: "4px", color: "#6b7280", fontSize: "0.9em" }}>Đã có TNV khác nhận hỗ trợ.</div>}
                    </div>
                  )}
                </Popup>
              </Marker>
              
              {isInProgress && req.rescuerLocation && (
                <Marker position={req.rescuerLocation} icon={blueIcon} zIndexOffset={900}>
                   <Tooltip direction="top" offset={[0, -40]} opacity={1}><span>🚑 {req.rescuerName}</span></Tooltip>
                   <Popup><strong>🚑 {req.rescuerName}</strong><br />📞 {req.rescuerPhone}<br /><em style={{ color: "green" }}>Đang di chuyển</em></Popup>
                </Marker>
              )}
            </React.Fragment>
          );
        })}
        
        {/* [MỚI] RENDER RELIEF POINTS CÓ ĐIỀU KIỆN (ẨN/HIỆN) */}
        {showReliefPoints && reliefPoints.map((point) => { 
            if (!point.location) return null; 
            const finalPosition = getDisplayPosition(point.location, currentUser?.location);
            return (
            <Marker key={`point-${point.id}`} position={finalPosition} icon={greenIcon} zIndexOffset={800}>
                <Tooltip direction="top" offset={[0, -40]} opacity={1}><span>⛺ {point.name}</span></Tooltip>
                <Popup>
                    <strong>{point.name}</strong><br/>
                    📍 {point.address}<hr style={{ margin: "5px 0" }}/>
                    📦 Hỗ trợ: {point.type}<br/>
                    <span style={{ color: point.status === "Active" ? "green" : "red", fontWeight: "bold" }}>● {point.status === "Active" ? "Đang hoạt động" : point.status}</span>
                </Popup>
            </Marker>
            ); 
        })}
        
        {location.state?.position && <Marker position={location.state.position} icon={blueIcon}><Popup>Vị trí tìm kiếm:<br/><strong>{location.state.name}</strong></Popup></Marker>}
      </MapContainer>

      {showRequestForm && <Modal title="Gửi yêu cầu khẩn cấp" onClose={() => setShowRequestForm(false)}><div className="form-group"><label>Bạn cần giúp gì?</label><select value={reqType} onChange={(e) => setReqType(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}><option>Cần lương thực</option><option>Cần thuốc men / Y tế</option><option>Cần sơ tán khẩn cấp</option><option>Cần áo phao / Thuyền</option><option>Khác</option></select></div><div className="form-group"><label>Mô tả chi tiết</label><textarea rows="4" placeholder="Mô tả tình trạng..." value={reqDesc} onChange={(e) => setReqDesc(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}/></div><button className="btn-primary" style={{ backgroundColor: "#dc2626" }} onClick={handleCreateRequest}>Gửi Yêu Cầu</button></Modal>}
      {showCancelModal && <Modal title="Lý do hủy nhiệm vụ" onClose={() => setShowCancelModal(false)}><div className="form-group"><label>Tại sao bạn muốn hủy cứu trợ này?</label><textarea rows="3" placeholder="Nhập lý do..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}/></div><button onClick={handleConfirmCancel} className="btn-primary" style={{ backgroundColor: "#dc2626", marginTop: "10px" }}>Xác nhận Hủy</button></Modal>}
      {showUpdateAddressModal && (<Modal title="Cập nhật Vị trí Hiện tại" onClose={() => setShowUpdateAddressModal(false)}><p style={{ color: "#dc2626", marginBottom: "10px" }}>⚠️ <strong>Lưu ý:</strong> Nhập địa chỉ chi tiết để định vị chính xác!</p><div className="form-group" ref={wrapperRef}><label>Địa chỉ hiện tại của bạn:</label><div className="address-input-container"><input type="text" placeholder="Nhập địa chỉ..." value={newAddressInput} onChange={handleAddressInputChange} onKeyDown={handleKeyDown} onFocus={() => newAddressInput && setShowSuggestions(true)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }} autoComplete="off" />{showSuggestions && suggestions.length > 0 && (<div className="suggestions-dropdown">{suggestions.map((item, index) => (<div key={index} className="suggestion-item" onClick={() => handleSelectSuggestion(item)}><span style={{ fontSize: "1.2rem" }}>📍</span><span className="suggestion-text">{item.display_name}</span></div>))}</div>)}</div></div><button onClick={handleUpdateAddress} className="btn-primary" disabled={isLoading} style={{ backgroundColor: "#007bff", marginTop: "10px" }}>{isLoading ? "Đang định vị..." : "Cập nhật Vị trí"}</button></Modal>)}
    </div>
  );
};

export default MapPage;