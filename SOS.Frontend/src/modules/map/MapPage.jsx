// src/modules/map/MapPage.jsx
import React, { useEffect, useState } from "react";
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

const MapPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- STATES ---
  const [currentUser, setCurrentUser] = useState(null);
  const [requests, setRequests] = useState([]);

  // State Form tạo yêu cầu
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqType, setReqType] = useState("Cần lương thực");
  const [reqDesc, setReqDesc] = useState("");

  // State Location
  const [provinces, setProvinces] = useState([]);
  const [currentProvince, setCurrentProvince] = useState(null);
  const [showLocaDropdown, setShowLocaDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State Modal Hủy Yêu Cầu
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [requestToCancel, setRequestToCancel] = useState(null);

  // State Modal Cập nhật Địa chỉ
  const [showUpdateAddressModal, setShowUpdateAddressModal] = useState(false);
  const [newAddressInput, setNewAddressInput] = useState("");
  const [manualPosition, setManualPosition] = useState(null);

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
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    const storedRequests = localStorage.getItem("RELIEF_REQUESTS");
    if (storedRequests) {
      setRequests(JSON.parse(storedRequests));
    }
  }, []);

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

  const handleUpdateAddress = async () => {
    if (!newAddressInput.trim()) {
      alert("Vui lòng nhập địa chỉ bạn đang ở!");
      return;
    }

    setIsLoading(true);

    try {
      const query = `${newAddressInput}, Việt Nam`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1`
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        const newCoords = [lat, lon];

        // Cập nhật thông tin user
        const updatedUser = {
          ...currentUser,
          address: data[0].display_name, // Lấy tên chuẩn từ API
          location: newCoords,
        };

        setCurrentUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Set manualPosition để map tự bay đến (Không cần navigate)
        setManualPosition(newCoords);

        alert("Đã cập nhật vị trí mới thành công!");
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

  // --- CÁC HÀM XỬ LÝ YÊU CẦU CỨU TRỢ ---
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

  const handleAcceptSupport = (request) => {
    if (!currentUser || currentUser.role !== "rescuer") return;
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
            status: "approved",
            rescuerName: null,
            rescuerPhone: null,
            cancelReason: cancelReason,
          }
        : r
    );

    setRequests(updatedRequests);
    localStorage.setItem("RELIEF_REQUESTS", JSON.stringify(updatedRequests));

    alert("Đã hủy nhận nhiệm vụ.");
    setShowCancelModal(false);
    setRequestToCancel(null);
  };

  // --- LOGIC VỊ TRÍ TRUNG TÂM ---
  const defaultPosition = [21.0285, 105.8542];
  const centerPosition = currentUser?.location || defaultPosition;
  const incomingPosition = location.state?.position;
  // [FIX] Thêm lại dòng này để tránh lỗi ReferenceError
  const incomingName = location.state?.name;

  // ƯU TIÊN CAO NHẤT: manualPosition (Vị trí vừa nhập tay)
  const effectiveCenter = manualPosition || incomingPosition || centerPosition;

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

      {/* Cụm nút chức năng cho Rescuee (SOS + Update Address) */}
      {currentUser?.role === "rescuee" && (
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
            <span>📍</span> Cập nhật lại địa chỉ
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

        {requests.map((req) => {
          if (req.status !== "approved" && req.status !== "in_progress")
            return null;

          const markerIcon = req.status === "in_progress" ? blueIcon : redIcon;

          return (
            <Marker key={req.id} position={req.location} icon={markerIcon}>
              <Tooltip direction="top" offset={[0, -40]} opacity={1}>
                <span>
                  {req.status === "in_progress"
                    ? "🚑 Đang cứu: "
                    : "🆘 Cần cứu: "}
                  {req.name}
                </span>
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
                {currentUser?.role === "rescuer" && (
                  <div style={{ marginTop: "10px", textAlign: "center" }}>
                    {/* 1. Chưa ai nhận */}
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

                    {/* 2. Tôi đã nhận */}
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
                            🚑 Bạn đang thực hiện
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

                    {/* 3. Người khác nhận */}
                    {req.status === "in_progress" &&
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
          );
        })}

        {currentUser && currentUser.location && (
          <Marker position={currentUser.location} icon={blueIcon} opacity={0.6}>
            <Popup>Vị trí của bạn</Popup>
          </Marker>
        )}

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

      {/* MODAL 3: CẬP NHẬT ĐỊA CHỈ */}
      {showUpdateAddressModal && (
        <Modal
          title="Cập nhật Vị trí Hiện tại"
          onClose={() => setShowUpdateAddressModal(false)}
        >
          <p style={{ color: "#dc2626", marginBottom: "10px" }}>
            ⚠️ <strong>Lưu ý:</strong> Địa chỉ càng chi tiết, hệ thống càng xác
            định tọa độ chính xác!
          </p>
          <div className="form-group">
            <label>Địa chỉ hiện tại của bạn:</label>
            <textarea
              rows="2"
              placeholder="Ví dụ: Số nhà 10, ngách 5, phố X, Phường Y, Quận Z..."
              value={newAddressInput}
              onChange={(e) => setNewAddressInput(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "5px",
                border: "1px solid #ddd",
              }}
            />
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
