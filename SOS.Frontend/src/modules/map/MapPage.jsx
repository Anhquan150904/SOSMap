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
import "./MapPage.css"; // Đảm bảo bạn đã paste CSS của bạn vào file này

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

// --- CẤU HÌNH GIỚI HẠN BẢN ĐỒ (VIỆT NAM) ---
const VIETNAM_BOUNDS = [
  [5.0, 101.0],
  [24.0, 118.0],
];

const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { duration: 2 });
    }
  }, [center, map]);
  return null;
};

const MapPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);

  // State quản lý danh sách yêu cầu cứu trợ
  const [requests, setRequests] = useState([]);

  // State cho Form tạo yêu cầu
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqType, setReqType] = useState("Cần lương thực");
  const [reqDesc, setReqDesc] = useState("");

  // State location
  const [provinces, setProvinces] = useState([]);
  const [currentProvince, setCurrentProvince] = useState(null);
  const [showLocaDropdown, setShowLocaDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleChooseProvince = async (province) => {
    setCurrentProvince(province);
    setShowLocaDropdown(false);
    setIsLoading(true);
    try {
      const query = `${province.name}, Việt Nam`;
      // Gọi API tìm kiếm tọa độ (Nominatim OpenStreetMap)
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

  const defaultPosition = [21.0285, 105.8542];

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

  const handleCreateRequest = () => {
    if (!currentUser || !currentUser.location) {
      alert(
        "Lỗi: Không tìm thấy vị trí của bạn. Vui lòng đăng ký lại địa chỉ."
      );
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

    alert("Đã gửi yêu cầu! Vui lòng chờ Admin duyệt để hiện lên bản đồ.");
    setShowRequestForm(false);
    setReqDesc("");
  };

  const centerPosition = currentUser?.location || defaultPosition;
  const incomingPosition = location.state?.position;
  const incomingName = location.state?.name;
  const effectiveCenter = incomingPosition || centerPosition;

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

      {/* NÚT TẠO YÊU CẦU */}
      {currentUser?.role === "rescuee" && (
        <button
          onClick={() => setShowRequestForm(true)}
          style={{
            position: "absolute",
            top: "20px",
            left: "200px",
            zIndex: 1000,
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

      {/* --- PHẦN CHỌN TỈNH THÀNH (Sử dụng class CSS bạn cung cấp) --- */}
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

      <MapContainer
        key={JSON.stringify(effectiveCenter)}
        center={effectiveCenter}
        zoom={14}
        scrollWheelZoom={true}
        minZoom={6}
        maxBounds={VIETNAM_BOUNDS}
        style={{ width: "100%", height: "100%" }}
      >
        <MapUpdater center={effectiveCenter} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {requests.map((req) => {
          // if (req.status !== "approved") return null;

          return (
            <Marker key={req.id} position={req.location} icon={redIcon}>
              <Tooltip direction="top" offset={[0, -40]} opacity={1}>
                <span>
                  🆘 {req.name} - {req.type}
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
                Địa chỉ: {req.address}
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

      {/* MODAL FORM */}
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
              placeholder="Mô tả tình trạng hiện tại..."
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
    </div>
  );
};

export default MapPage;
