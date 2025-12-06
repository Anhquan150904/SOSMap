// src/modules/map/MapPage.jsx
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Import CSS bắt buộc
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

// --- FIX LỖI MẤT ICON CỦA LEAFLET TRONG REACT ---
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: iconMarker,
    iconRetinaUrl: iconRetina,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;
// --------------------------------------------------

const MapPage = () => {
  const navigate = useNavigate();

  // Tọa độ Hà Nội: [21.0285, 105.8542]
  // Tọa độ TP.HCM: [10.762622, 106.660172]
  const position = [10.762622, 106.660172]; 

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

      {/* Bản đồ Leaflet */}
      <MapContainer 
        center={position} 
        zoom={13} 
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        {/* Lớp bản đồ nền OpenStreetMap (Miễn phí) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Điểm đánh dấu */}
        <Marker position={position}>
          <Popup>
            Vị trí cứu hộ trung tâm. <br /> Cần hỗ trợ?
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default MapPage;