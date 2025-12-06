// src/modules/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();

  // 1. Khởi tạo state rỗng (để chờ nạp dữ liệu thật)
  const [requests, setRequests] = useState([]);

  // 2. KẾT NỐI DỮ LIỆU: Load từ LocalStorage khi trang vừa mở
  useEffect(() => {
    const storedData = localStorage.getItem('RELIEF_REQUESTS');
    if (storedData) {
      // Nếu có dữ liệu thì nạp vào
      setRequests(JSON.parse(storedData));
    }
  }, []); // [] nghĩa là chỉ chạy 1 lần khi load trang

  // 3. XỬ LÝ DUYỆT ĐƠN & LƯU LẠI
  const updateStatus = (id, newStatus) => {
    const updatedRequests = requests.map(req => 
      req.id === id ? { ...req, status: newStatus } : req
    );
    
    setRequests(updatedRequests);
    
    // QUAN TRỌNG: Lưu ngược lại vào kho để MapPage bên kia biết là đã duyệt
    localStorage.setItem('RELIEF_REQUESTS', JSON.stringify(updatedRequests));
  };

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h2>🛡️ Trung Tâm Điều Phối (Admin)</h2>
        <button onClick={handleLogout} className="btn-logout">Đăng xuất</button>
      </header>

      <div className="dashboard-container">
        
        {/* ROW 1: CHỜ DUYỆT */}
        <div className="dashboard-row row-pending">
          <div className="row-header">
            <h3>⏳ Yêu cầu mới chờ duyệt ({requests.filter(r => r.status === 'pending').length})</h3>
          </div>
          <div className="row-content">
            {requests.filter(r => r.status === 'pending').length === 0 ? (
                <p className="empty-text">Hiện không có yêu cầu nào.</p>
            ) : (
                requests.filter(r => r.status === 'pending').map(req => (
                <div key={req.id} className="request-card">
                    <div className="card-info">
                        <h4>{req.name}</h4>
                        {/* Hiển thị Địa chỉ & SĐT thật từ form gửi sang */}
                        <p>📍 {req.address}</p> 
                        <p>📞 {req.phone}</p>
                        <p className="req-type">🆘 {req.type}</p>
                        {/* Hiển thị mô tả nếu có */}
                        {req.description && <p style={{fontStyle:'italic', fontSize:'0.9rem', color:'#555'}}>"{req.description}"</p>}
                    </div>
                    <button 
                      className="btn-action btn-approve"
                      onClick={() => updateStatus(req.id, 'approved')}
                    >
                      ✅ Duyệt ngay
                    </button>
                </div>
                ))
            )}
          </div>
        </div>

        {/* ROW 2: ĐANG THỰC HIỆN (ĐÃ HIỆN TRÊN MAP) */}
        <div className="dashboard-row row-approved">
          <div className="row-header">
            <h3>🚑 Đang hiển thị trên Map ({requests.filter(r => r.status === 'approved').length})</h3>
          </div>
          <div className="row-content">
            {requests.filter(r => r.status === 'approved').map(req => (
              <div key={req.id} className="request-card">
                 <div className="card-info">
                    <h4>{req.name}</h4>
                    <p>📍 {req.address}</p>
                    <p className="req-type">🆘 {req.type}</p>
                </div>
                <button 
                  className="btn-action btn-complete"
                  onClick={() => updateStatus(req.id, 'completed')}
                >
                  🏁 Xong (Ẩn khỏi Map)
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ROW 3: LỊCH SỬ HOÀN THÀNH */}
        <div className="dashboard-row row-completed">
          <div className="row-header">
            <h3>🎉 Đã hoàn thành ({requests.filter(r => r.status === 'completed').length})</h3>
          </div>
          <div className="row-content">
            {requests.filter(r => r.status === 'completed').map(req => (
              <div key={req.id} className="request-card completed-card">
                 <div className="card-info">
                    <h4>{req.name}</h4>
                    <p>📍 {req.address}</p>
                    <span className="badge-done">Thành công</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;