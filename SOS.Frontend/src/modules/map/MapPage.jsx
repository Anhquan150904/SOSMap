// src/modules/map/MapPage.jsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet'; // <-- Thêm useMap, Tooltip
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import Modal from '../../components/Modal'; // Import Modal để dùng cho form tạo yêu cầu

// --- CẤU HÌNH ICON MÀU SẮC ---
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
// ------------------------------------------------------------------

// --- CẤU HÌNH GIỚI HẠN BẢN ĐỒ (VIỆT NAM) ---
const VIETNAM_BOUNDS = [
  [5.0, 101.0], 
  [24.0, 118.0] 
];

// Component phụ để di chuyển map
function ChangeView({ center, zoom }) {
  const map = useMap(); // useMap phải được import từ react-leaflet
  map.setView(center, zoom);
  return null;
}

const MapPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  // State quản lý danh sách yêu cầu cứu trợ
  const [requests, setRequests] = useState([]);
  
  // State cho Form tạo yêu cầu
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqType, setReqType] = useState('Cần lương thực');
  const [reqDesc, setReqDesc] = useState('');

  // Mặc định (Hà Nội) nếu chưa đăng nhập
  const defaultPosition = [21.0285, 105.8542]; 

  useEffect(() => {
    // 1. Lấy thông tin user đăng nhập (GIỮ NGUYÊN KEY 'user')
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }

    // 2. Lấy danh sách yêu cầu cứu trợ từ LocalStorage
    const storedRequests = localStorage.getItem('RELIEF_REQUESTS');
    if (storedRequests) {
      setRequests(JSON.parse(storedRequests));
    }
  }, []);

  // --- HÀM TẠO YÊU CẦU CỨU TRỢ ---
  const handleCreateRequest = () => {
    if (!currentUser || !currentUser.location) {
      alert("Lỗi: Không tìm thấy vị trí của bạn. Vui lòng đăng ký lại địa chỉ.");
      return;
    }

    const newRequest = {
      id: Date.now(),
      userId: currentUser.phone,
      name: currentUser.name,
      phone: currentUser.phone,
      address: currentUser.address,
      location: currentUser.location, // Lấy tọa độ hiện tại của user
      type: reqType,
      description: reqDesc,
      status: 'pending', // Mặc định chờ duyệt
      timestamp: new Date().toLocaleString()
    };

    const updatedRequests = [...requests, newRequest];
    setRequests(updatedRequests);
    
    // Lưu vào LocalStorage
    localStorage.setItem('RELIEF_REQUESTS', JSON.stringify(updatedRequests));

    alert("Đã gửi yêu cầu! Vui lòng chờ Admin duyệt để hiện lên bản đồ.");
    setShowRequestForm(false);
    setReqDesc('');
  };

  // Xác định vị trí hiển thị: Ưu tiên vị trí của User
  const centerPosition = currentUser?.location || defaultPosition;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      
      {/* Nút Quay lại */}
      <button 
        onClick={() => navigate('/home')}
        style={{
            position: 'absolute', top: '20px', left: '60px', zIndex: 1000,
            padding: '10px 20px', backgroundColor: 'white', border: 'none',
            borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            cursor: 'pointer', fontWeight: 'bold', color: '#333',
            display: 'flex', alignItems: 'center', gap: '5px'
        }}
      >
        <span>⬅</span> Quay lại
      </button>

      {/* NÚT TẠO YÊU CẦU (Chỉ hiện nếu là role rescuee) */}
      {currentUser?.role === 'rescuee' && (
        <button 
          onClick={() => setShowRequestForm(true)}
          style={{
              position: 'absolute', top: '20px', left: '200px', zIndex: 1000,
              padding: '10px 20px', backgroundColor: '#dc2626', color: 'white', border: 'none',
              borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              cursor: 'pointer', fontWeight: 'bold',
              display: 'flex', alignItems: 'center', gap: '5px'
          }}
        >
          <span>🆘</span> Gửi tín hiệu SOS
        </button>
      )}

      {/* KEY: Thêm key để map re-render khi center thay đổi */}
      <MapContainer 
        key={JSON.stringify(centerPosition)} 
        center={centerPosition} 
        zoom={14} 
        scrollWheelZoom={true}
        minZoom={6}
        maxBounds={VIETNAM_BOUNDS}
        style={{ width: '100%', height: '100%' }}
      >
        <ChangeView center={centerPosition} zoom={14} />

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* LOGIC HIỂN THỊ MARKER: Chỉ hiện các yêu cầu đã được Admin duyệt */}
        {requests.map((req) => {
          if (req.status !== 'approved') return null;

          return (
            <Marker key={req.id} position={req.location} icon={redIcon}>
              <Tooltip direction="top" offset={[0, -40]} opacity={1}>
                <span>🆘 {req.name} - {req.type}</span>
              </Tooltip>

              <Popup>
                <strong>{req.name}</strong> <br/>
                SĐT: <a href={`tel:${req.phone}`}>{req.phone}</a> <br/>
                <hr style={{margin:'5px 0'}}/>
                Lý do: <span style={{color: '#d9534f', fontWeight: 'bold'}}>{req.type}</span> <br/>
                Chi tiết: {req.description} <br/>
                Địa chỉ: {req.address}
              </Popup>
            </Marker>
          );
        })}

        {/* Marker vị trí của tôi (Optional: Có thể giữ hoặc bỏ nếu muốn chỉ hiện yêu cầu) */}
        {currentUser && currentUser.location && (
          <Marker position={currentUser.location} icon={blueIcon} opacity={0.6}>
            <Popup>Vị trí của bạn</Popup>
          </Marker>
        )}

      </MapContainer>

      {/* MODAL FORM TẠO YÊU CẦU */}
      {showRequestForm && (
        <Modal title="Gửi yêu cầu khẩn cấp" onClose={() => setShowRequestForm(false)}>
           <div className="form-group">
              <label>Bạn cần giúp gì?</label>
              <select 
                value={reqType} onChange={(e) => setReqType(e.target.value)}
                style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd'}}
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
                value={reqDesc} onChange={(e) => setReqDesc(e.target.value)}
                style={{width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd'}}
              />
           </div>
           <button className="btn-primary" style={{backgroundColor: '#dc2626'}} onClick={handleCreateRequest}>
             Gửi Yêu Cầu
           </button>
        </Modal>
      )}

    </div>
  );
};

export default MapPage;