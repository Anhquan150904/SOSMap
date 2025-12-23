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
import * as signalR from "@microsoft/signalr"; 
import Modal from "../../components/Modal";
import "./MapPage.css";

// --- CONFIG ---
const API_BASE = "http://localhost:5075/api";
const SIGNALR_HUB_URL = "http://localhost:5075/SignalRHub";

// --- ICONS ---
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

// --- LOADING SPINNER ---
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

// Component di chuyển map
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, zoom); }, [center, zoom, map]);
  return null;
}

const MapPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- REFS ---
  const mapRef = useRef(null);
  const routingControlRef = useRef(null);
  const connectionRef = useRef(null); 
  const wrapperRef = useRef(null);
  // [NEW] Ref cho debounce
  const debounceRef = useRef(null);

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

  const [showReliefPoints, setShowReliefPoints] = useState(false);
  const [manualPosition, setManualPosition] = useState(() => {
      const saved = localStorage.getItem("MANUAL_POSITION");
      return saved ? JSON.parse(saved) : null;
  });

  // UI States
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqType, setReqType] = useState("Cần lương thực");
  const [reqDesc, setReqDesc] = useState("");
  // [FIX] Thêm state reqAddress
  const [reqAddress, setReqAddress] = useState("");
  // [FIX] Thêm state isSubmitting
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [requestToCancel, setRequestToCancel] = useState(null);
  
  const [showUpdateAddressModal, setShowUpdateAddressModal] = useState(false);
  const [newAddressInput, setNewAddressInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // [FIX] Thêm activeAutocomplete
  const [activeAutocomplete, setActiveAutocomplete] = useState(null);

  // --- STATE THÔNG BÁO ---
  const [notifications, setNotifications] = useState(() => {
      const saved = localStorage.getItem("MAP_NOTIFICATIONS");
      return saved ? JSON.parse(saved) : [];
  });
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const MapRefHandler = () => {
    const map = useMap();
    useEffect(() => { mapRef.current = map; }, [map]);
    return null;
  };

  // --- TÍCH HỢP SIGNALR (Giữ nguyên) ---
  useEffect(() => {
    if (!currentUser) return;

    const setupSignalR = async () => {
        if (connectionRef.current && connectionRef.current.state !== signalR.HubConnectionState.Disconnected) {
            return; 
        }

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(SIGNALR_HUB_URL)
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Error) 
            .build();

        connectionRef.current = connection;

        const addNotify = (title, message, type = "info") => {
            const newNoti = {
                id: Date.now() + Math.random(),
                title,
                message: typeof message === 'object' ? JSON.stringify(message) : message,
                type, 
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                isRead: false
            };
            
            setNotifications(prev => {
                const updated = [newNoti, ...prev].slice(0, 50);
                localStorage.setItem("MAP_NOTIFICATIONS", JSON.stringify(updated));
                return updated;
            });
            setUnreadCount(prev => prev + 1);
        };

        // --- EVENTS ---
        connection.on("ServerMessage", (msg) => {
            if (msg.includes("Kết nối") || msg.includes("ConnectionId") || msg.includes("Joined")) return;
            addNotify("💬 Hệ thống", msg, "info");
        });

        connection.on("ReportCreated", (payload) => {
            if (currentUser.role === 'volunteer') {
                const pName = payload.Name || payload.name || 'Người dân';
                const pDetails = payload.Details || payload.details || payload.Level || payload.level || 'Cần hỗ trợ';
                addNotify("🚨 CÓ ĐƠN CỨU TRỢ MỚI!", `${pName} cần giúp: ${pDetails}`, "error");
                // initMapData(); // Có thể bật lại nếu muốn refresh data
            }

            else if (currentUser.role === 'citizen') {
                const rId = payload.ReportId || payload.reportId || payload.Id || payload.id || "N/A";
                addNotify("✅ Đơn cứu trợ đã được gửi", `Đơn #${rId} của bạn đã được ghi nhận và đang chờ xử lý.`, "success");
            }
        });

        connection.on("ReportStatusChanged", async () => {
            const statusLower = String(rStatus).toLowerCase();

            if (statusLower === "accepted" || statusLower === "inprocess" || statusLower === "in_procgress") {
                addNotify("🟢 Đã có người tiếp nhận", "Đã nhận đơn của bạn và đang trên đường đến.", "success");
                initMapData();
            } 
            else if (statusLower === "done" || statusLower === "completed") {
                addNotify("✅ Cứu trợ hoàn thành", `Đơn đã xử lý xong.`, "success");
                initMapData();
            }
            initMapData();
        });

        connection.on("ReportCanceled", (payload) => {
            const reason = payload.Note || payload.note || payload.Reason || payload.reason || 'Không rõ';
            addNotify("❌ Đơn cứu trợ bị hủy", `Lý do: ${reason}`, "error");
            initMapData();
        });

        connection.on("TaskCanceledApproved", (payload) => {
            if (currentUser.role === 'volunteer') {
                const tId = payload.TaskId || payload.taskId || "N/A";
                addNotify("✅ Yêu cầu hủy được duyệt", `Nhiệm vụ #${tId} đã hủy thành công.`, "success");
                initMapData();
            }
        });

        // START
        try {
            await connection.start();
            const role = currentUser.role ? currentUser.role.toLowerCase() : "citizen";
            const status = currentUser.status ? currentUser.status.toLowerCase() : "active";
            const userId = currentUser.id || currentUser.userId;
            await connection.invoke("JoinByRoleAndStatus", role, status, userId);
            console.log("✅ MapPage SignalR Connected");
        } catch (err) { console.error("SignalR Error:", err); }
    };

    setupSignalR();

    return () => {
        if (connectionRef.current) {
            connectionRef.current.stop();
            connectionRef.current = null;
        }
    };
  }, [currentUser]); 

  // --- CHECK NAVIGATE ---
  useEffect(() => {
    if (location.state && location.state.position) {
        setShowReliefPoints(true);
    } else {
        setShowReliefPoints(false);
    }
  }, [location.state]);

  // --- INIT DATA ---
  const initMapData = async () => {
      try {
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
            if (geoData && geoData.length > 0) location = [parseFloat(geoData[0].lat), parseFloat(geoData[0].lon)];
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
                
                if (currentUser && (currentUser.id === rescuerId || currentUser.userId === rescuerId)) {
                    if (!rescuerPhone) rescuerPhone = currentUser.phone;
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
      } 
  };

  // --- 1. [TỐI ƯU HÓA] LOAD USER & REPORTS & TASKS SONG SONG ---
  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      
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
          
          // [FIX] Gán địa chỉ mặc định cho form SOS
          if(freshUser.address) setReqAddress(freshUser.address);

        } catch (err) {}
      }

      await initMapData();
      setIsLoading(false);
    };

    loadAll();
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

  const getDisplayPosition = (targetLoc, userLoc) => {
    if (!targetLoc || !userLoc) return targetLoc;
    const EPSILON = 0.00001; 
    const OFFSET = 0.00015; // ~15m
    const latDiff = Math.abs(targetLoc[0] - userLoc[0]);
    const lngDiff = Math.abs(targetLoc[1] - userLoc[1]);
    if (latDiff < EPSILON && lngDiff < EPSILON) {
        return [targetLoc[0] + OFFSET, targetLoc[1] + OFFSET];
    }
    return targetLoc;
  };

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

  // --- AUTOCOMPLETE HANDLERS ---
  const handleAddressInputChange = (e) => { setNewAddressInput(e.target.value); };
  
  // [FIX] Hàm handleReqAddressChange mới
  const handleReqAddressChange = (e) => {
      const value = e.target.value;
      setReqAddress(value);
      setActiveAutocomplete("sos");
      if (!value.trim()) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
          try {
              const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=1&limit=5&countrycodes=vn`);
              const data = await res.json();
              setSuggestions(data);
              setShowSuggestions(true);
          } catch (err) {}
      }, 300);
  };

  const handleSearchAddress = async () => { /* Logic cũ cho Update Address Modal */
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
  
  const handleSelectSuggestion = (item) => { 
      if (activeAutocomplete === "sos") {
          setReqAddress(item.display_name);
      } else {
          setNewAddressInput(item.display_name); 
      }
      setShowSuggestions(false); 
      setActiveAutocomplete(null);
  };
  
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
    } catch (error) { alert("Có lỗi khi cập nhật địa chỉ"); } finally { setIsLoading(false); }
  };

  // [FIX] Hàm handleCreateRequest mới
  const handleCreateRequest = async () => { 
    if (!currentUser) { alert("Vui lòng đăng nhập."); return; }
    if (!reqAddress.trim()) { alert("Vui lòng nhập địa chỉ."); return; }
    
    setIsLoading(true);
    setIsSubmitting(true);
    try {
      // Geocode địa chỉ SOS
      let finalLocation = currentUser.location;
      let finalAddress = reqAddress;

      try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(reqAddress)}&limit=1`);
          const data = await res.json();
          if (data && data.length > 0) {
              finalLocation = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
              finalAddress = data[0].display_name;
          }
      } catch (e) {}

      const payload = { 
        phone: currentUser.phone, 
        name: currentUser.fullName || currentUser.name, 
        address: finalAddress, 
        details: reqDesc, 
        level: reqType,
        latitude: finalLocation ? finalLocation[0] : 0,
        longitude: finalLocation ? finalLocation[1] : 0
      };
      
      const res = await axios.post(`${API_BASE}/reports`, payload, { 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem("accessToken")}` } 
      });

      alert("✅ Đã gửi tín hiệu SOS thành công! Vui lòng chờ Admin duyệt.");
      setShowRequestForm(false); 
      setReqDesc("");
      initMapData(); // Tải lại danh sách đơn

    } catch (error) { 
      console.error("Lỗi tạo yêu cầu:", error); 
      alert("❌ Gửi yêu cầu thất bại."); 
    } finally { 
      setIsLoading(false); 
      setIsSubmitting(false);
    }
  };

  // --- [NEW] NOTIFICATION HELPERS ---
  const handleBellClick = () => {
      setShowNotiDropdown(!showNotiDropdown);
      setUnreadCount(0);
  };

  const clearNotifications = () => {
      setNotifications([]);
      localStorage.removeItem("MAP_NOTIFICATIONS");
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
      
      {/* ICON THÔNG BÁO */}
      {currentUser && (
          <div className="map-notification-container">
              <div className="map-bell-icon" onClick={handleBellClick}>
                  🔔
                  {unreadCount > 0 && <span className="map-badge">{unreadCount}</span>}
              </div>
              
              {showNotiDropdown && (
                  <div className="map-noti-dropdown">
                      <div className="map-noti-header">
                          <span>Thông báo ({notifications.length})</span>
                          <button onClick={clearNotifications} style={{fontSize:'0.8rem', color:'#dc2626', background:'none', border:'none', cursor:'pointer'}}>Xóa tất cả</button>
                      </div>
                      <div className="map-noti-body">
                          {notifications.length === 0 ? (
                              <div style={{padding:'20px', textAlign:'center', color:'#999'}}>Không có thông báo.</div>
                          ) : (
                              notifications.map(n => (
                                  <div key={n.id} className={`map-noti-item ${n.type}`}>
                                      <div style={{display:'flex', justifyContent:'space-between'}}>
                                          <strong>{n.title}</strong>
                                          <small>{n.time}</small>
                                      </div>
                                      <div style={{fontSize:'0.9rem', marginTop:'4px'}}>{n.message}</div>
                                  </div>
                              ))
                          )}
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* NÚT ĐIỂM AN TOÀN */}
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

      {/* NÚT SOS & UPDATE LOCATION */}
      {currentUser && (
        <div className="lst-btn-rescuee" style={{ position: "absolute", top: "20px", left: "200px", zIndex: 1000, display: "flex", gap: "10px" }}>
          {isCitizenFunc && <button onClick={() => { setReqAddress(currentUser.address || ""); setShowRequestForm(true); }} style={{ padding: "10px 20px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", cursor: "pointer", fontWeight: "bold" }}>🆘 Gửi tín hiệu SOS</button>}
          <button onClick={() => { setNewAddressInput(currentUser?.address || ""); setShowUpdateAddressModal(true); }} style={{ padding: "10px 12px", backgroundColor: "white", color: "#333", border: "1px solid #ddd", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", cursor: "pointer", fontWeight: "600" }}>📍 Cập nhật vị trí</button>
        </div>
      )}

      <MapContainer center={effectiveCenter} zoom={14} scrollWheelZoom={true} minZoom={6} maxBounds={VIETNAM_BOUNDS} style={{ width: "100%", height: "100%" }}>
        <MapRefHandler /> 
        <ChangeView center={effectiveCenter} zoom={14} />
        
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {currentUser && currentUser.location && <Marker position={currentUser.location} icon={isVolunteerFunc ? blueIcon : redIcon} opacity={0.6} zIndexOffset={-100}><Popup>Vị trí của bạn</Popup></Marker>}
        
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
               {isInProgress && req.rescuerLocation && (<Marker position={req.rescuerLocation} icon={blueIcon} zIndexOffset={900}>
                   <Tooltip direction="top" offset={[0, -40]} opacity={1}><span>🚑 {req.rescuerName}</span></Tooltip>
                   <Popup><strong>🚑 {req.rescuerName}</strong><br />📞 {req.rescuerPhone}<br /><em style={{ color: "green" }}>Đang di chuyển</em></Popup>
               </Marker>)}
             </React.Fragment>
           );
        })}
        
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

      {/* [FIX] MODAL SOS */}
      {showRequestForm && (
        <Modal title="Gửi yêu cầu khẩn cấp" onClose={() => setShowRequestForm(false)}>
            <div className="form-group">
                <label>Bạn cần giúp gì?</label>
                <select value={reqType} onChange={(e) => setReqType(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}>
                    <option>Cần lương thực</option>
                    <option>Cần thuốc men / Y tế</option>
                    <option>Cần sơ tán khẩn cấp</option>
                    <option>Cần áo phao / Thuyền</option>
                    <option>Khác</option>
                </select>
            </div>
            <div className="form-group" ref={wrapperRef}>
                <label>Địa chỉ <span style={{ color: "red" }}>*</span></label>
                <div className="address-input-container">
                    <input 
                        type="text" 
                        placeholder="Nhập địa chỉ của bạn..." 
                        value={reqAddress} 
                        onChange={handleReqAddressChange} 
                        onFocus={() => reqAddress && setActiveAutocomplete("sos") && setShowSuggestions(true)}
                        style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #007bff" }} 
                        autoComplete="off" 
                    />
                    {showSuggestions && activeAutocomplete === "sos" && suggestions.length > 0 && (
                        <div className="suggestions-dropdown">
                            {suggestions.map((item, index) => (
                                <div key={index} className="suggestion-item" onClick={() => handleSelectSuggestion(item)}>
                                    <span style={{ fontSize: "1.2rem" }}>📍</span>
                                    <span className="suggestion-text">{item.display_name}</span>
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
                    placeholder="Mô tả tình trạng..." 
                    value={reqDesc} 
                    onChange={(e) => setReqDesc(e.target.value)} 
                    style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}
                />
            </div>
            <button className="btn-primary" style={{ backgroundColor: "#dc2626", marginTop: "10px" }} onClick={handleCreateRequest} disabled={isSubmitting}>
                {isSubmitting ? "Đang gửi..." : "Gửi Yêu Cầu"}
            </button>
        </Modal>
      )}

      {showCancelModal && <Modal title="Lý do hủy nhiệm vụ" onClose={() => setShowCancelModal(false)}><div className="form-group"><label>Tại sao bạn muốn hủy cứu trợ này?</label><textarea rows="3" placeholder="Nhập lý do..." value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}/></div><button onClick={handleConfirmCancel} className="btn-primary" style={{ backgroundColor: "#dc2626", marginTop: "10px" }}>Xác nhận Hủy</button></Modal>}
      
      {showUpdateAddressModal && (<Modal title="Cập nhật Vị trí Hiện tại" onClose={() => setShowUpdateAddressModal(false)}><p style={{ color: "#dc2626", marginBottom: "10px" }}>⚠️ <strong>Lưu ý:</strong> Nhập địa chỉ chi tiết để định vị chính xác!</p><div className="form-group" ref={wrapperRef}><label>Địa chỉ hiện tại của bạn:</label><div className="address-input-container"><input type="text" placeholder="Nhập địa chỉ..." value={newAddressInput} onChange={handleAddressInputChange} onKeyDown={handleKeyDown} onFocus={() => newAddressInput && setShowSuggestions(true)} style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }} autoComplete="off" />{showSuggestions && suggestions.length > 0 && (<div className="suggestions-dropdown">{suggestions.map((item, index) => (<div key={index} className="suggestion-item" onClick={() => handleSelectSuggestion(item)}><span style={{ fontSize: "1.2rem" }}>📍</span><span className="suggestion-text">{item.display_name}</span></div>))}</div>)}</div></div><button onClick={handleUpdateAddress} className="btn-primary" disabled={isLoading} style={{ backgroundColor: "#007bff", marginTop: "10px" }}>{isLoading ? "Đang định vị..." : "Cập nhật Vị trí"}</button></Modal>)}
    </div>
  );
};

export default MapPage;