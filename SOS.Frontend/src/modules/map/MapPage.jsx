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
    <h3 style={{ marginTop: "15px", color: "#333" }}>Đang tải dữ liệu bản đồ...</h3>
    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
  </div>
);

// Component để di chuyển map mượt mà không cần remount
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

  // Khởi tạo reliefPoints từ localStorage
  const [reliefPoints, setReliefPoints] = useState(() => {
    const saved = localStorage.getItem("RELIEF_POINTS");
    return saved ? JSON.parse(saved) : [];
  });

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

  // --- 1. LOAD USER & REPORTS & TASKS (CORE LOGIC) ---
  useEffect(() => {
    const initMapData = async () => {
      setIsLoading(true);
      console.log("🚀 Bắt đầu initMapData...");
      
      const API_BASE = "http://localhost:5075/api";
      
      // 1. Sync User
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

      // 2. Load Reports & Sync Tasks
      try {
        console.log("📡 Đang gọi API lấy danh sách Reports...");
        const [resAccepted, resInProcess, resCancelPending] = await Promise.all([
            axios.get(`${API_BASE}/reports/status/Accepted`).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/InProcess`).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/CancelPending`).catch(() => ({ data: [] }))
        ]);

        const rawReports = [
            ...(resAccepted.data || []), 
            ...(resInProcess.data || []),
            ...(resCancelPending.data || [])
        ];
        
        console.log(`✅ Đã tải ${rawReports.length} reports.`);

        const processedReports = [];
        
        // Duyệt qua từng report
        for (const report of rawReports) {
          if (report.status === "Completed") continue;
          
          const reportId = report.reportId || report.id;

          // =======================================================
          // 🔥 1. GỌI API GET TASK
          // =======================================================
          let task = null;
          try {
            const taskRes = await axios.get(`${API_BASE}/reports/tasks/gettask/${reportId}`);
            if (taskRes.data) {
                if (Array.isArray(taskRes.data) && taskRes.data.length > 0) {
                    task = taskRes.data[0];
                } else if (!Array.isArray(taskRes.data)) {
                    task = taskRes.data;
                }
                console.log(`🎯 TÌM THẤY TASK cho Report ${reportId}:`, task);
            }
          } catch (e) {}

          // =======================================================
          // 🔥 2. GEOCODE
          // =======================================================
          let location = null;
          if (report.address) {
            try {
              const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(report.address)}&limit=1`);
              const geoData = await geoRes.json();
              if (geoData?.length) location = [parseFloat(geoData[0].lat), parseFloat(geoData[0].lon)];
            } catch {}
          }
          
          if (!location) {
              console.warn(`❌ Không tìm thấy tọa độ cho Report ${reportId} (${report.address}) -> Bỏ qua vẽ marker.`);
              continue; 
          }

          let displayStatus = "accepted";
          let rescuerName = null;
          let rescuerPhone = null;
          let rescuerLocation = null;
          let taskId = null;
          let rescuerId = null; // Thêm trường này để so sánh ID
          let cancelReason = null;

          // 🔥 QUAN TRỌNG: MAPPING DỮ LIỆU TASK VÀO REPORT
          if (task && task.id) {
            taskId = task.id;
            
          if (task.status === "in_progress") displayStatus = "in_progress";
          if (task.status === "pending_to_cancel") {
              displayStatus = "pending-to-cancel";
              cancelReason = task.note || "Đang chờ duyệt hủy";
          }
          if (task.status === "completed") continue;

            // Map dữ liệu từ Task
            rescuerId = task.volunteerId; // Lấy ID của tình nguyện viên
            rescuerName = task.volunteerName;
            rescuerLocation = task.volunteerLocation;
            
            // Xử lý logic số điện thoại và fallback ID
            rescuerPhone = task.volunteerPhone; 
            
            // 🔥 FIX LỖI: Nếu ID trùng với user hiện tại -> Tự điền phone nếu thiếu
            if (freshUser && (freshUser.id === rescuerId || freshUser.userId === rescuerId)) {
                if (!rescuerPhone) {
                    rescuerPhone = freshUser.phone;
                }
            }
          }
          console.log("Report ID:", reportId, "Display Status:", displayStatus, "Rescuer ID:", rescuerId, "Current User ID:", freshUser?.id || freshUser?.userId);
          processedReports.push({
            id: reportId, reportId, taskId,
            name: report.name, phone: report.phone, address: report.address, location,
            type: report.level, description: report.details,
            status: displayStatus, 
            rescuerId, // Lưu ID để so sánh ở render
            rescuerName, rescuerPhone, rescuerLocation, cancelReason
          });
        }

        console.log("🏁 Hoàn tất xử lý reports. Update state...");
        setRequests(processedReports);
        localStorage.setItem("RELIEF_REQUESTS_STATE", JSON.stringify(processedReports));

      } catch (err) {
        console.error("❌ Lỗi CRITICAL trong initMapData:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initMapData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- LOGIC LOAD RELIEF POINTS (ĐIỂM AN TOÀN) ---
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
                if (data && data.length > 0) return { ...p, location: [parseFloat(data[0].lat), parseFloat(data[0].lon)] };
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

  // --- TỰ ĐỘNG VẼ LẠI ROUTE ---
  useEffect(() => {
    if (!currentUser || !mapRef.current || requests.length === 0) return;
    
    // Tìm task nào đang InProgress và là của user hiện tại (So sánh cả ID và Phone)
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

  // --- HANDLERS ---
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

      // Cập nhật state cục bộ
      const newRequests = requests.map((r) => {
        if (r.reportId === request.reportId) {
          return {
            ...r, 
            taskId: res.data.taskId, 
            status: "in_progress",
            rescuerId: volunteerId, // Lưu ID ngay
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

  const handleAddressInputChange = (e) => {
    const value = e.target.value;
    setNewAddressInput(value);
    if (!value.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=1&limit=5&countrycodes=vn`);
        const data = await res.json();
        setSuggestions(data); setShowSuggestions(true);
      } catch (error) {}
    }, 200);
  };
  const handleSelectSuggestion = (item) => { setNewAddressInput(item.display_name); setShowSuggestions(false); };
  
  const handleUpdateAddress = async () => {
    if (!newAddressInput.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newAddressInput)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const newCoords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        const updatedUser = { ...currentUser, address: data[0].display_name, location: newCoords };
        setCurrentUser(updatedUser);
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        setManualPosition(newCoords);
        localStorage.setItem("MANUAL_POSITION", JSON.stringify(newCoords));
        alert("Đã cập nhật vị trí thành công!");
        setShowUpdateAddressModal(false);
      } else { alert("Không tìm thấy vị trí"); }
    } catch (e) {} finally { setIsLoading(false); }
  };

  const handleCreateRequest = async () => { 
    if (!currentUser) { alert("Vui lòng đăng nhập."); return; }
    if (!currentUser.address) { alert("Vui lòng cập nhật vị trí/địa chỉ của bạn trước khi gửi yêu cầu."); return; }
    setIsLoading(true);
    try {
      const API_BASE = "http://localhost:5075/api";
      const payload = { phone: currentUser.phone, name: currentUser.fullName || currentUser.name, address: currentUser.address, details: reqDesc, level: reqType };
      await axios.post(`${API_BASE}/reports`, payload, { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem("accessToken")}` } });
      alert("✅ Đã gửi tín hiệu SOS thành công!");
      setShowRequestForm(false); setReqDesc("");
      window.location.reload(); 
    } catch (error) { console.error("Lỗi tạo yêu cầu:", error); alert("❌ Gửi yêu cầu thất bại."); } finally { setIsLoading(false); }
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
        
        {requests.map((req) => {
            const isAccepted = req.status === "accepted";
            const isInProgress = req.status === "in_progress";
            const isPendingCancel = req.status === "pending-to-cancel";

            // 🔥 LOGIC KIỂM TRA TASK CỦA MÌNH (Ưu tiên ID -> Phone)
            let isMyTask = false;
            if (currentUser) {
                const currentUserId = currentUser.id || currentUser.userId;
                // Check ID
                if (req.rescuerId && currentUserId && req.rescuerId === currentUserId) {
                    isMyTask = true;
                }
                // Fallback Check Phone
                else if (req.rescuerPhone && currentUser.phone && req.rescuerPhone === currentUser.phone) {
                    isMyTask = true;
                }
            }

            let statusLabel = "";
            if (isAccepted) statusLabel = "Đã duyệt - Cần người cứu";
            if (isInProgress) statusLabel = isMyTask ? "Đang thực hiện (Bởi bạn)" : "Người khác đang cứu";
            if (isPendingCancel) statusLabel = "Đang chờ Admin hủy";

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
                  
                  <div style={{ marginTop: "5px", fontStyle: "italic", color: "#666" }}>Trạng thái: <strong>{statusLabel}</strong></div>
                  
                  {isPendingCancel && <div style={{color: "orange", fontSize: "0.9em"}}>Lý do hủy: {req.cancelReason}</div>}

                  {isVolunteerFunc && (
                    <div style={{ marginTop: "10px", textAlign: "center" }}>
                      {/* 1. Chỉ hiện nút "Tôi sẽ cứu" khi thực sự là accepted và chưa có ai nhận */}
                      {req.status === "accepted" && (
                        <button onClick={() => handleAcceptSupport(req)} style={{ background: "#007bff", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", width: "100%" }}>
                          ✋ Tôi sẽ cứu
                        </button>
                      )}

                      {/* 2. Nếu đang in_progress hoặc pending cancel */}
                      {(req.status === "in_progress" || req.status === "pending-to-cancel") && isMyTask && (
                        <div style={{ background: "#d1fae5", padding: "5px", borderRadius: "4px" }}>
                          <button onClick={() => drawRoute(currentUser.location, req.location)} style={{ background: "#3b82f6", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", width: "100%", marginBottom: "5px" }}>
                            🗺️ Dẫn đường
                          </button>

                          {req.status !== "pending-to-cancel" && (
                            <>
                              <button onClick={() => handleCompleteSupport(req)} style={{ background: "#059669", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", width: "100%", marginBottom: "5px" }}>
                                ✅ Đã xong
                              </button>
                              <button onClick={() => handleTriggerCancel(req)} style={{ background: "#dc2626", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", width: "100%" }}>
                                ❌ Hủy nhận
                              </button>
                            </>
                          )}
                          {req.status === "pending-to-cancel" && <div style={{fontSize: '0.8rem', color: '#d97706'}}>Đang chờ duyệt hủy...</div>}
                        </div>
                      )}

                      {/* 3. Nếu đang in_progress nhưng không phải của mình */}
                      {req.status === "in_progress" && !isMyTask && (
                        <div style={{ background: "#f3f4f6", padding: "5px", borderRadius: "4px", color: "#6b7280", fontSize: "0.9em" }}>
                          Đã có TNV khác nhận hỗ trợ.
                        </div>
                      )}
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
        
        {reliefPoints.map((point) => { 
            if (!point.location) return null; 
            return (
            <Marker key={`point-${point.id}`} position={point.location} icon={greenIcon} zIndexOffset={800}>
                <Tooltip direction="top" offset={[0, -40]} opacity={1}><span>⛺ {point.name}</span></Tooltip>
                <Popup>
                    <strong>{point.name}</strong><br/>
                    📍 {point.address}<hr style={{ margin: "5px 0" }}/>
                    📦 Hỗ trợ: {point.type}<br/>
                    <span style={{ color: point.status === "Đang hoạt động" ? "green" : "red", fontWeight: "bold" }}>● {point.status}</span>
                </Popup>
            </Marker>
            ); 
        })}
        {location.state?.position && <Marker position={location.state.position} icon={blueIcon}><Popup>Vị trí tìm kiếm:<br/><strong>{location.state.name}</strong></Popup></Marker>}
      </MapContainer>

      {showRequestForm && <Modal title="Gửi yêu cầu khẩn cấp" onClose={() => setShowRequestForm(false)}><div className="form-group"><label>Bạn cần giúp gì?</label><select value={reqType} onChange={(e) => setReqType(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}><option>Cần lương thực</option><option>Cần thuốc men / Y tế</option><option>Cần sơ tán khẩn cấp</option><option>Cần áo phao / Thuyền</option><option>Khác</option></select></div><div className="form-group"><label>Mô tả chi tiết</label><textarea rows="4" placeholder="Mô tả tình trạng..." value={reqDesc} onChange={(e) => setReqDesc(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}/></div><button className="btn-primary" style={{ backgroundColor: "#dc2626" }} onClick={handleCreateRequest}>Gửi Yêu Cầu</button></Modal>}
      {showCancelModal && <Modal title="Lý do hủy nhiệm vụ" onClose={() => setShowCancelModal(false)}><div className="form-group"><label>Tại sao bạn muốn hủy cứu trợ này?</label><textarea rows="3" placeholder="Nhập lý do..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}/></div><button onClick={handleConfirmCancel} className="btn-primary" style={{ backgroundColor: "#dc2626", marginTop: "10px" }}>Xác nhận Hủy</button></Modal>}
      {showUpdateAddressModal && (<Modal title="Cập nhật Vị trí Hiện tại" onClose={() => setShowUpdateAddressModal(false)}><p style={{ color: "#dc2626", marginBottom: "10px" }}>⚠️ <strong>Lưu ý:</strong> Nhập địa chỉ chi tiết để định vị chính xác!</p><div className="form-group" ref={wrapperRef}><label>Địa chỉ hiện tại của bạn:</label><div className="address-input-container"><input type="text" placeholder="Nhập địa chỉ..." value={newAddressInput} onChange={handleAddressInputChange} onFocus={() => newAddressInput && setShowSuggestions(true)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }} autoComplete="off"/>{showSuggestions && suggestions.length > 0 && (<div className="suggestions-dropdown">{suggestions.map((item, index) => (<div key={index} className="suggestion-item" onClick={() => handleSelectSuggestion(item)}><span style={{ fontSize: "1.2rem" }}>📍</span><span className="suggestion-text">{item.display_name}</span></div>))}</div>)}</div></div><button onClick={handleUpdateAddress} className="btn-primary" disabled={isLoading} style={{ backgroundColor: "#007bff", marginTop: "10px" }}>{isLoading ? "Đang định vị..." : "Cập nhật Vị trí"}</button></Modal>)}
    </div>
  );
};

export default MapPage;