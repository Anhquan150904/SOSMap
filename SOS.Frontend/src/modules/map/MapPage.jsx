// src/modules/map/MapPage.jsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import Modal from '../../components/Modal';

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

// --- GIỚI HẠN BẢN ĐỒ VIỆT NAM ---
const VIETNAM_BOUNDS = [
  [5.0, 101.0], 
  [24.0, 118.0] 
];

function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

const MapPage = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  // State danh sách yêu cầu
  const [requests, setRequests] = useState([]);
  
  // State Form tạo yêu cầu
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqType, setReqType] = useState('Cần lương thực');
  const [reqDesc, setReqDesc] = useState('');

  const defaultPosition = [21.0285, 105.8542]; 

  useEffect(() => {
    // 1. Lấy user từ key 'user' (Theo đúng source code của bạn)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }

    // 2. Lấy danh sách yêu cầu
    const storedRequests = localStorage.getItem('RELIEF_REQUESTS');
    if (storedRequests) {
      setRequests(JSON.parse(storedRequests));
    }
  }, []);

  // --- HÀM 1: TẠO YÊU CẦU (Cho Rescuee) ---
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
      status: 'pending', // Mặc định chờ duyệt
      timestamp: new Date().toLocaleString()
    };

    const updatedRequests = [...requests, newRequest];
    setRequests(updatedRequests);
    localStorage.setItem('RELIEF_REQUESTS', JSON.stringify(updatedRequests));

    alert("Đã gửi yêu cầu! Vui lòng chờ Admin duyệt.");
    setShowRequestForm(false);
    setReqDesc('');
  };

  // --- HÀM 2: NHẬN HỖ TRỢ (Cho Rescuer) ---
  const handleAcceptSupport = (request) => {
    if (!currentUser || currentUser.role !== 'rescuer') return;

    const confirm = window.confirm(`Bạn có chắc chắn muốn nhận cứu trợ cho ${request.name}?`);
    if (!confirm) return;

    const updatedRequests = requests.map(r => 
      r.id === request.id ? { 
        ...r, 
        status: 'in_progress', // Chuyển sang trạng thái đang cứu
        rescuerName: currentUser.name, // Lưu tên người cứu
        rescuerPhone: currentUser.phone 
      } : r
    );

    setRequests(updatedRequests);
    localStorage.setItem('RELIEF_REQUESTS', JSON.stringify(updatedRequests));
    alert("Đã nhận nhiệm vụ! Hãy di chuyển đến vị trí người bị nạn.");
  };

  // --- HÀM 3: HOÀN THÀNH (Cho Rescuer) ---
  const handleCompleteSupport = (request) => {
    const confirm = window.confirm("Xác nhận đã cứu trợ thành công?");
    if (!confirm) return;

    const updatedRequests = requests.map(r => 
      r.id === request.id ? { ...r, status: 'completed' } : r
    );

    setRequests(updatedRequests);
    localStorage.setItem('RELIEF_REQUESTS', JSON.stringify(updatedRequests));
    alert("Cảm ơn bạn! Yêu cầu đã hoàn tất.");
  };

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

      {/* Nút Gửi SOS (Chỉ hiện cho Rescuee) */}
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

      <MapContainer 
        key={JSON.stringify(centerPosition)} 
        center={centerPosition} zoom={14} scrollWheelZoom={true}
        minZoom={6} maxBounds={VIETNAM_BOUNDS}
        style={{ width: '100%', height: '100%' }}
      >
        <ChangeView center={centerPosition} zoom={14} />
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* LOGIC VẼ MARKER TRÊN BẢN ĐỒ */}
        {requests.map((req) => {
          // Chỉ hiện đơn Đã duyệt (approved) hoặc Đang cứu (in_progress)
          // Ẩn đơn Chờ duyệt (pending) và Đã xong (completed)
          if (req.status !== 'approved' && req.status !== 'in_progress') return null;

          // Màu icon: Approved = Đỏ, In_progress = Xanh
          const markerIcon = req.status === 'in_progress' ? blueIcon : redIcon;

          return (
            <Marker key={req.id} position={req.location} icon={markerIcon}>
              <Tooltip direction="top" offset={[0, -40]} opacity={1}>
                <span>
                    {req.status === 'in_progress' ? '🚑 Đang cứu: ' : '🆘 Cần cứu: '} 
                    {req.name}
                </span>
              </Tooltip>

              <Popup>
                <strong>{req.name}</strong> <br/>
                SĐT: <a href={`tel:${req.phone}`}>{req.phone}</a> <br/>
                <hr style={{margin:'5px 0'}}/>
                Lý do: <span style={{color: '#d9534f', fontWeight: 'bold'}}>{req.type}</span> <br/>
                Chi tiết: {req.description} <br/>
                Địa chỉ: {req.address} <br/>

                {/* --- PHẦN NÚT BẤM DÀNH CHO RESCUER --- */}
                {currentUser?.role === 'rescuer' && (
                  <div style={{marginTop: '10px', textAlign: 'center'}}>
                    
                    {/* 1. Chưa ai nhận -> Hiện nút NHẬN */}
                    {req.status === 'approved' && (
                      <button 
                        onClick={() => handleAcceptSupport(req)}
                        style={{background:'#007bff', color:'white', border:'none', padding:'6px 12px', borderRadius:'4px', cursor:'pointer', width:'100%'}}
                      >
                        ✋ Tôi sẽ cứu người này
                      </button>
                    )}

                    {/* 2. Tôi đã nhận -> Hiện nút HOÀN THÀNH */}
                    {req.status === 'in_progress' && req.rescuerPhone === currentUser.phone && (
                      <div style={{background: '#d1fae5', padding: '5px', borderRadius: '4px'}}>
                        <p style={{margin:'0 0 5px 0', color: '#065f46', fontSize: '0.85rem'}}>🚑 Bạn đang thực hiện</p>
                        <button 
                          onClick={() => handleCompleteSupport(req)}
                          style={{background:'#059669', color:'white', border:'none', padding:'6px 12px', borderRadius:'4px', cursor:'pointer', width:'100%'}}
                        >
                          ✅ Đã cứu xong
                        </button>
                      </div>
                    )}

                    {/* 3. Người khác đã nhận */}
                    {req.status === 'in_progress' && req.rescuerPhone !== currentUser.phone && (
                       <p style={{color: '#9333ea', fontStyle:'italic', fontWeight: 'bold'}}>
                         ⚠️ Đã có người khác nhận
                       </p>
                    )}
                  </div>
                )}
              </Popup>
            </Marker>
          );
        })}

        {/* Marker vị trí của tôi */}
        {currentUser && currentUser.location && (
          <Marker position={currentUser.location} icon={blueIcon} opacity={0.6}>
            <Popup>Vị trí của bạn</Popup>
          </Marker>
        )}

      </MapContainer>

      {/* FORM TẠO YÊU CẦU */}
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
                placeholder="Mô tả tình trạng..."
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