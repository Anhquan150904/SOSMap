// src/modules/map/MapPage.jsx
import React, { useEffect, useState, useRef } from "react"; // Thêm useRef
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate, useLocation } from "react-router-dom";
import L from "leaflet";
import Modal from "../../components/Modal";
import "./MapPage.css";

// --- CẤU HÌNH ICON MÀU SẮC ---
const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const blueIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// --- GIỚI HẠN BẢN ĐỒ VIỆT NAM ---
const VIETNAM_BOUNDS = [
  [5.0, 101.0],
  [24.0, 118.0],
];

function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

// --- 2. COMPONENT VẼ ĐƯỜNG DẪN (ROUTING) ---
const RoutingMachine = ({ start, end }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !start || !end) return;

    // Tạo control chỉ đường
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start[0], start[1]), // Điểm bắt đầu (Volunteer)
        L.latLng(end[0], end[1]), // Điểm kết thúc (Citizen)
      ],
      routeWhileDragging: false,
      show: false, // Ẩn bảng hướng dẫn text
      addWaypoints: false, // Không cho phép kéo thả
      fitSelectedRoutes: true, // Tự động zoom
      lineOptions: {
        styles: [{ color: "#6FA1EC", weight: 6 }], // Đường màu xanh
      },
      createMarker: function () {
        return null;
      },
    }).addTo(map);

    return () => {
      // Xóa đường dẫn cũ khi tọa độ thay đổi
      map.removeControl(routingControl);
    };
  }, [map, start, end]);

  return null;
};

const MapPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- STATES ---
  const [currentUser, setCurrentUser] = useState(null);
  const [requests, setRequests] = useState([]);

  // State Form
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqType, setReqType] = useState("Cần lương thực");
  const [reqDesc, setReqDesc] = useState("");

  // State Location (Dropdown chọn tỉnh)
  const [provinces, setProvinces] = useState([]);
  const [currentProvince, setCurrentProvince] = useState(null);
  const [showLocaDropdown, setShowLocaDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State Modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [requestToCancel, setRequestToCancel] = useState(null);
  const [showUpdateAddressModal, setShowUpdateAddressModal] = useState(false);
  const [newAddressInput, setNewAddressInput] = useState("");
  const [manualPosition, setManualPosition] = useState(null);

  // State Routing
  const [activeRoute, setActiveRoute] = useState(null);

  // --- EFFECTS ---
  useEffect(() => {
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
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    const storedRequests = localStorage.getItem("RELIEF_REQUESTS");
    if (storedRequests) {
      setRequests(JSON.parse(storedRequests));
    }
  }, []);

  // Effect click outside để ẩn popup gợi ý
  useEffect(() => {
    if (!currentUser || requests.length === 0) return;

    const activeReq = requests.find((r) => {
      const isMyTask =
        (r.status === "in_progress" || r.status === "cancel_pending") &&
        (r.userId === currentUser.phone ||
          r.rescuerPhone === currentUser.phone);
      return isMyTask;
    });

    if (activeReq && activeReq.rescuerLocation && activeReq.location) {
      setActiveRoute({
        start: activeReq.rescuerLocation,
        end: activeReq.location,
      });
    } else {
      setActiveRoute(null);
    }
  }, [requests, currentUser]);

  // --- HANDLERS ---

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
          state: { position: [lat, lon], name: province.name },
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

  // --- HÀM CẬP NHẬT ĐỊA CHỈ ---
  const handleUpdateAddress = async () => {
    if (!newAddressInput.trim()) {
      alert("Vui lòng nhập địa chỉ bạn đang ở!");
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          newAddressInput
        )}&limit=1`
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const newCoords = [lat, lon];

        const updatedUser = {
          ...currentUser,
          address: data[0].display_name,
          location: newCoords,
        };

        setCurrentUser(updatedUser);
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        setManualPosition(newCoords);

        // Update DB gốc
        const userDB = JSON.parse(
          localStorage.getItem("USER_DATABASE") || "{}"
        );
        const userKey = `${updatedUser.phone}_${updatedUser.role}`;
        if (userDB[userKey]) {
          userDB[userKey] = updatedUser;
          localStorage.setItem("USER_DATABASE", JSON.stringify(userDB));
        }

        // Nếu là Volunteer và đang làm nhiệm vụ -> Cập nhật vào đơn hàng
        if (currentUser.role === "volunteer") {
          const activeReqIndex = requests.findIndex(
            (r) =>
              (r.status === "in_progress" || r.status === "cancel_pending") &&
              r.rescuerPhone === currentUser.phone
          );

          if (activeReqIndex !== -1) {
            const updatedRequests = [...requests];
            updatedRequests[activeReqIndex] = {
              ...updatedRequests[activeReqIndex],
              rescuerLocation: newCoords,
            };
            setRequests(updatedRequests);
            localStorage.setItem(
              "RELIEF_REQUESTS",
              JSON.stringify(updatedRequests)
            );
          }
        }

        alert("Đã cập nhật vị trí! Đường dẫn sẽ được vẽ lại.");
        setShowUpdateAddressModal(false);
        setNewAddressInput("");
      } else {
        alert(
          "❌ Không tìm thấy địa chỉ này trên bản đồ!\n\nGợi ý: Hãy nhập chi tiết hơn (Số nhà, Đường, Quận/Huyện, Tỉnh/Thành)."
        );
      }
    } catch (error) {
      console.error("Lỗi tìm kiếm tọa độ:", error);
      alert("Lỗi kết nối bản đồ. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRequest = () => {
    if (!currentUser || !currentUser.location) {
      alert("Lỗi: Không tìm thấy vị trí của bạn.");
      return;
    }
    const newRequest = {
      id: Date.now(),
      userId: currentUser.phone,
      name: currentUser.name,
      phone: currentUser.phone,
      address: currentUser.address,
      location: currentUser.location,
      type: reqType,
      description: reqDesc,
      status: "pending",
      timestamp: new Date().toLocaleString(),
    };
    const updatedRequests = [...requests, newRequest];
    setRequests(updatedRequests);
    localStorage.setItem("RELIEF_REQUESTS", JSON.stringify(updatedRequests));
    alert("Đã gửi yêu cầu! Vui lòng chờ Admin duyệt.");
    setShowRequestForm(false);
    setReqDesc("");
  };

  // --- [MỚI] HÀM XỬ LÝ CITIZEN HỦY ĐƠN ---
  const handleCitizenCancelRequest = (req) => {
    const confirm = window.confirm(
      "Bạn đã an toàn và muốn hủy yêu cầu cứu trợ này?"
    );
    if (!confirm) return;

    if (req.status === "in_progress" && req.rescuerPhone) {
      const notis = JSON.parse(
        localStorage.getItem("SYSTEM_NOTIFICATIONS") || "[]"
      );
      notis.push({
        to: req.rescuerPhone,
        targetRole: "volunteer", // [QUAN TRỌNG] Gửi cho Volunteer
        message: `⚠️ Người dân ${req.name} đã hủy yêu cầu cứu trợ vì họ đã an toàn. Bạn hãy dừng nhiệm vụ.`,
        time: new Date().toLocaleString(),
        isRead: false,
      });
      localStorage.setItem("SYSTEM_NOTIFICATIONS", JSON.stringify(notis));
    }

    const updatedRequests = requests.map((r) =>
      r.id === req.id ? { ...r, status: "canceled" } : r
    );

    setRequests(updatedRequests);
    localStorage.setItem("RELIEF_REQUESTS", JSON.stringify(updatedRequests));
    alert("Đã hủy yêu cầu thành công!");
  };

  const handleAcceptSupport = (request) => {
    if (!currentUser || currentUser.role !== "volunteer") return;

    if (!currentUser.location) {
      alert("Bạn cần cập nhật vị trí của mình trước khi nhận nhiệm vụ!");
      setNewAddressInput(currentUser.address || "");
      setShowUpdateAddressModal(true);
      return;
    }

    const confirm = window.confirm(
      `Bạn có chắc chắn muốn nhận cứu trợ cho ${request.name}?`
    );
    if (!confirm) return;
    const updatedRequests = requests.map((r) =>
      r.id === request.id
        ? {
            ...r,
            status: "in_progress",
            rescuerName: currentUser.name,
            rescuerPhone: currentUser.phone,
          }
        : r
    );
    setRequests(updatedRequests);
    localStorage.setItem("RELIEF_REQUESTS", JSON.stringify(updatedRequests));
    alert("Đã nhận nhiệm vụ! Hãy di chuyển đến vị trí người bị nạn.");
  };

  const handleCompleteSupport = (request) => {
    const confirm = window.confirm("Xác nhận đã cứu trợ thành công?");
    if (!confirm) return;
    const updatedRequests = requests.map((r) =>
      r.id === request.id ? { ...r, status: "completed" } : r
    );
    setRequests(updatedRequests);
    localStorage.setItem("RELIEF_REQUESTS", JSON.stringify(updatedRequests));
    alert("Cảm ơn bạn! Yêu cầu đã hoàn tất.");
  };

  const handleTriggerCancel = (request) => {
    setRequestToCancel(request);
    setCancelReason("");
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      alert("Vui lòng nhập lý do hủy!");
      return;
    }
    const updatedRequests = requests.map((r) =>
      r.id === requestToCancel.id
        ? {
            ...r,
            status: "cancel_pending",
            cancelReason: cancelReason,
          }
        : r
    );
    setRequests(updatedRequests);
    localStorage.setItem("RELIEF_REQUESTS", JSON.stringify(updatedRequests));
    alert("Đã gửi yêu cầu hủy! Vui lòng chờ Admin phê duyệt.");
    setShowCancelModal(false);
    setRequestToCancel(null);
  };

  // --- LOGIC VỊ TRÍ TRUNG TÂM ---
  const defaultPosition = [21.0285, 105.8542];
  const centerPosition = currentUser?.location || defaultPosition;
  const incomingPosition = location.state?.position;
  const incomingName = location.state?.name;

  const effectiveCenter = manualPosition || incomingPosition || centerPosition;

  // LOGIC HIỂN THỊ NÚT
  const isCitizenFunc =
    currentUser?.role === "citizen" ||
    currentUser?.role === "volunteer-pending";
  const isVolunteerFunc = currentUser?.role === "volunteer";

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      {/* Nút Quay lại */}
      <button
        onClick={() => navigate("/home")}
        style={{
          position: "absolute",
          top: "20px",
          left: "60px",
          zIndex: 1000,
          padding: "10px 20px",
          backgroundColor: "white",
          border: "none",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          cursor: "pointer",
          fontWeight: "bold",
          color: "#333",
          display: "flex",
          alignItems: "center",
          gap: "5px",
        }}
      >
        <span>⬅</span> Quay lại
      </button>

      {/* Thông báo nếu đang chờ duyệt */}
      {currentUser?.role === "volunteer-pending" && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            background: "rgba(255, 165, 0, 0.9)",
            color: "white",
            textAlign: "center",
            padding: "5px",
            zIndex: 2000,
            fontWeight: "bold",
          }}
        >
          ⚠️ Tài khoản Tình nguyện viên đang chờ duyệt.
        </div>
      )}

      {/* Cụm nút hành động */}
      {currentUser && (
        <div
          className="lst-btn-rescuee"
          style={{
            position: "absolute",
            top: "20px",
            left: "200px",
            zIndex: 1000,
            display: "flex",
            gap: "10px",
          }}
        >
          {isCitizenFunc && (
            <button
              onClick={() => setShowRequestForm(true)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#dc2626",
                color: "white",
                border: "none",
                borderRadius: "8px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>🆘</span> Gửi tín hiệu SOS
            </button>
          )}

          <button
            onClick={() => {
              setNewAddressInput(currentUser?.address || "");
              setShowUpdateAddressModal(true);
            }}
            style={{
              padding: "10px 12px",
              backgroundColor: "white",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              cursor: "pointer",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📍</span>{" "}
            {isVolunteerFunc ? "Cập nhật vị trí" : "Sửa địa chỉ"}
          </button>
        </div>
      )}

      {/* Dropdown chọn tỉnh thành */}
      <div
        className="box-location"
        style={{
          position: "absolute",
          bottom: "30px",
          left: "20px",
          zIndex: 1000,
          marginLeft: 0,
        }}
      >
        <div
          className="location-badge bottom"
          onClick={() => setShowLocaDropdown(!showLocaDropdown)}
        >
          {currentProvince ? currentProvince.name : "Chọn tỉnh"} ▴
        </div>

        {showLocaDropdown && (
          <div
            className="lst-provinces-drop"
            style={{
              top: "auto",
              bottom: "20px",
              marginBottom: "10px",
            }}
          >
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

      {/* Bản đồ Leaflet */}
      <MapContainer
        key={JSON.stringify(effectiveCenter)}
        center={effectiveCenter}
        zoom={14}
        scrollWheelZoom={true}
        minZoom={6}
        maxBounds={VIETNAM_BOUNDS}
        style={{ width: "100%", height: "100%" }}
      >
        <ChangeView center={effectiveCenter} zoom={14} />

        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* --- VẼ TUYẾN ĐƯỜNG MỚI (NẾU CÓ) --- */}
        {activeRoute && (
          <RoutingMachine start={activeRoute.start} end={activeRoute.end} />
        )}

        {/* 1. MARKER VỊ TRÍ CỦA TÔI (Z-INDEX THẤP NHẤT) */}
        {currentUser && currentUser.location && (
          <Marker
            position={currentUser.location}
            icon={isVolunteerFunc ? blueIcon : redIcon}
            opacity={0.6}
            zIndexOffset={-100} // <-- Đẩy xuống dưới cùng
          >
            <Popup>Vị trí của bạn</Popup>
          </Marker>
        )}

        {/* 2. MARKER ĐƠN HÀNG (Z-INDEX CAO NHẤT) */}
        {requests.map((req) => {
          if (
            req.status !== "approved" &&
            req.status !== "in_progress" &&
            req.status !== "cancel_pending"
          )
            return null;

          return (
            <React.Fragment key={req.id}>
              {/* 1. MARKER CỦA CITIZEN (LUÔN ĐỎ) */}
              <Marker
                position={req.location}
                icon={redIcon}
                zIndexOffset={1000} // <-- Luôn nổi lên trên cùng
              >
                <Tooltip direction="top" offset={[0, -40]} opacity={1}>
                  <span>🆘 {req.name} (Cần cứu)</span>
                </Tooltip>

                <Popup>
                  <strong>{req.name}</strong> <br />
                  SĐT: <a href={`tel:${req.phone}`}>{req.phone}</a> <br />
                  <hr style={{ margin: "5px 0" }} />
                  Lý do:{" "}
                  <span style={{ color: "#d9534f", fontWeight: "bold" }}>
                    {req.type}
                  </span>{" "}
                  <br />
                  Chi tiết: {req.description} <br />
                  Địa chỉ: {req.address} <br />
                  {/* --- [MỚI] NÚT CHO CITIZEN HỦY ĐƠN --- */}
                  {currentUser && currentUser.phone === req.userId && (
                    <button
                      onClick={() => handleCitizenCancelRequest(req)}
                      style={{
                        marginTop: "10px",
                        width: "100%",
                        padding: "5px",
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "bold",
                      }}
                    >
                      ✅ Tôi đã an toàn / Hủy yêu cầu
                    </button>
                  )}
                  {/* Nút hành động cho Volunteer */}
                  {isVolunteerFunc && (
                    <div style={{ marginTop: "10px", textAlign: "center" }}>
                      {req.status === "approved" && (
                        <button
                          onClick={() => handleAcceptSupport(req)}
                          style={{
                            background: "#007bff",
                            color: "white",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            width: "100%",
                          }}
                        >
                          ✋ Tôi sẽ cứu người này
                        </button>
                      )}

                      {/* Trường hợp tôi đang thực hiện */}
                      {req.status === "in_progress" &&
                        req.rescuerPhone === currentUser.phone && (
                          <div
                            style={{
                              background: "#d1fae5",
                              padding: "5px",
                              borderRadius: "4px",
                            }}
                          >
                            <p
                              style={{
                                margin: "0 0 5px 0",
                                color: "#065f46",
                                fontSize: "0.85rem",
                              }}
                            >
                              Đang dẫn đường...
                            </p>
                            <button
                              onClick={() => handleCompleteSupport(req)}
                              style={{
                                background: "#059669",
                                color: "white",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                width: "100%",
                              }}
                            >
                              ✅ Đã cứu xong
                            </button>
                            <button
                              onClick={() => handleTriggerCancel(req)}
                              style={{
                                background: "#dc2626",
                                marginTop: "8px",
                                color: "white",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                width: "100%",
                              }}
                            >
                              ❌ Hủy nhận
                            </button>
                          </div>
                        )}

                      {/* Trường hợp đang chờ Admin duyệt hủy */}
                      {req.status === "cancel_pending" &&
                        req.rescuerPhone === currentUser.phone && (
                          <div
                            style={{
                              background: "#fff7ed",
                              padding: "5px",
                              borderRadius: "4px",
                              border: "1px solid #fed7aa",
                            }}
                          >
                            <p
                              style={{
                                color: "#c2410c",
                                fontWeight: "bold",
                                margin: 0,
                                fontSize: "0.9rem",
                              }}
                            >
                              ⏳ Đang chờ Admin duyệt hủy...
                            </p>
                            <small style={{ color: "#555" }}>
                              Lý do: {req.cancelReason}
                            </small>
                          </div>
                        )}

                      {/* Người khác nhận */}
                      {(req.status === "in_progress" ||
                        req.status === "cancel_pending") &&
                        req.rescuerPhone !== currentUser.phone && (
                          <p
                            style={{
                              color: "#9333ea",
                              fontStyle: "italic",
                              fontWeight: "bold",
                            }}
                          >
                            ⚠️ Đã có người khác nhận
                          </p>
                        )}
                    </div>
                  )}
                </Popup>
              </Marker>

              {/* 2. MARKER CỦA VOLUNTEER (XANH) */}
              {(req.status === "in_progress" ||
                req.status === "cancel_pending") &&
                req.rescuerLocation && (
                  <Marker
                    position={req.rescuerLocation}
                    icon={blueIcon}
                    zIndexOffset={900} // <-- Nổi thứ 2
                  >
                    <Tooltip direction="top" offset={[0, -40]} opacity={1}>
                      <span>🚑 {req.rescuerName} (Đang đến)</span>
                    </Tooltip>
                    <Popup>
                      <strong>🚑 {req.rescuerName}</strong> <br />
                      📞 {req.rescuerPhone} <br />
                      <em style={{ color: "green" }}>
                        Đang di chuyển đến vị trí cứu trợ
                      </em>
                    </Popup>
                  </Marker>
                )}
            </React.Fragment>
          );
        })}

        {incomingPosition &&
          JSON.stringify(incomingPosition) !==
            JSON.stringify(currentUser?.location) && (
            <Marker position={incomingPosition} icon={blueIcon}>
              <Popup>
                Vị trí tìm kiếm: <br /> <strong>{incomingName}</strong>
              </Popup>
            </Marker>
          )}
      </MapContainer>

      {/* MODAL 1: FORM TẠO YÊU CẦU SOS */}
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
          <div className="form-group">
            <label>Mô tả chi tiết</label>
            <textarea
              rows="4"
              placeholder="Mô tả tình trạng..."
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
            style={{ backgroundColor: "#dc2626" }}
            onClick={handleCreateRequest}
          >
            Gửi Yêu Cầu
          </button>
        </Modal>
      )}

      {/* MODAL 2: FORM HỦY YÊU CẦU */}
      {showCancelModal && (
        <Modal
          title="Lý do hủy nhiệm vụ"
          onClose={() => setShowCancelModal(false)}
        >
          <div className="form-group">
            <label>Tại sao bạn muốn hủy cứu trợ này?</label>
            <textarea
              rows="3"
              placeholder="Nhập lý do (ví dụ: Xe hỏng, đường bị chặn...)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ddd",
              }}
            />
          </div>
          <button
            onClick={handleConfirmCancel}
            className="btn-primary"
            style={{ backgroundColor: "#dc2626", marginTop: "10px" }}
          >
            Xác nhận Hủy
          </button>
        </Modal>
      )}

      {/* MODAL 3: CẬP NHẬT ĐỊA CHỈ (ĐÃ THÊM GỢI Ý) */}
      {showUpdateAddressModal && (
        <Modal
          title="Cập nhật Vị trí Hiện tại"
          onClose={() => setShowUpdateAddressModal(false)}
        >
          <p style={{ color: "#dc2626", marginBottom: "10px" }}>
            ⚠️ <strong>Lưu ý:</strong> Nhập địa chỉ chi tiết để định vị chính
            xác!
          </p>
          <div className="form-group" ref={wrapperRef}>
            <label>Địa chỉ hiện tại của bạn:</label>

            {/* CONTAINER CHO INPUT VÀ DROPDOWN */}
            <div className="address-input-container">
              <input
                type="text"
                placeholder="Nhập địa chỉ..."
                value={newAddressInput}
                onChange={handleAddressInputChange}
                onFocus={() => newAddressInput && setShowSuggestions(true)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "5px",
                  border: "1px solid #ddd",
                }}
                autoComplete="off"
              />

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

          <button
            onClick={handleUpdateAddress}
            className="btn-primary"
            disabled={isLoading}
            style={{ backgroundColor: "#007bff", marginTop: "10px" }}
          >
            {isLoading ? "Đang định vị..." : "Cập nhật Vị trí"}
          </button>
        </Modal>
      )}
    </div>
  );
};

export default MapPage;
