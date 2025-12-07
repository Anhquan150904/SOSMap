// src/modules/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);

  // Load dữ liệu
  useEffect(() => {
    const storedData = localStorage.getItem('RELIEF_REQUESTS');
    if (storedData) setRequests(JSON.parse(storedData));
  }, []);

  // Admin CHỈ CÓ QUYỀN DUYỆT (từ pending -> approved)
  const handleApprove = (id) => {
    const updatedRequests = requests.map(req => 
      req.id === id ? { ...req, status: 'approved' } : req
    );
    setRequests(updatedRequests);
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
        
        {/* 1. CHỜ DUYỆT */}
        <div className="dashboard-row row-pending">
          <div className="row-header">
            <h3>⏳ Chờ duyệt ({requests.filter(r => r.status === 'pending').length})</h3>
          </div>
          <div className="row-content">
            {requests.filter(r => r.status === 'pending').map(req => (
              <div key={req.id} className="request-card">
                 <div className="card-info">
                    <h4>{req.name}</h4>
                    <p>📍 {req.address}</p>
                    <p>🆘 {req.type}</p>
                 </div>
                 <button className="btn-action btn-approve" onClick={() => handleApprove(req.id)}>
                   ✅ Duyệt đơn
                 </button>
              </div>
            ))}
          </div>
        </div>

        {/* 2. ĐÃ DUYỆT - CHỜ NGƯỜI NHẬN (Màu xanh dương) */}
        <div className="dashboard-row row-approved">
          <div className="row-header">
            <h3>📢 Đang tìm người hỗ trợ ({requests.filter(r => r.status === 'approved').length})</h3>
            <small style={{color:'#555'}}>Đang hiển thị trên bản đồ để các Rescuer nhìn thấy</small>
          </div>
          <div className="row-content">
            {requests.filter(r => r.status === 'approved').map(req => (
              <div key={req.id} className="request-card">
                 <div className="card-info">
                    <h4>{req.name}</h4>
                    <p>📍 {req.address}</p>
                    <p className="req-type">🆘 {req.type}</p>
                    <p style={{fontStyle:'italic', color:'orange'}}>Waiting...</p>
                 </div>
                 {/* Admin KHÔNG có nút hành động ở đây */}
              </div>
            ))}
          </div>
        </div>

        {/* 3. ĐANG ĐƯỢC HỖ TRỢ (Màu tím - Trạng thái mới) */}
        <div className="dashboard-row row-inprogress">
          <div className="row-header">
            <h3>🚑 Đang được cứu hộ ({requests.filter(r => r.status === 'in_progress').length})</h3>
          </div>
          <div className="row-content">
            {requests.filter(r => r.status === 'in_progress').map(req => (
              <div key={req.id} className="request-card">
                 <div className="card-info">
                    <h4>{req.name}</h4>
                    <p>📍 {req.address}</p>
                    <p className="req-type">🆘 {req.type}</p>
                    <hr style={{margin:'5px 0', border:'0', borderTop:'1px dashed #ccc'}}/>
                    <p><strong>Người nhận:</strong> {req.rescuerName || 'Ẩn danh'}</p>
                    <p>📞 {req.rescuerPhone}</p>
                 </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. ĐÃ HOÀN THÀNH */}
        <div className="dashboard-row row-completed">
          <div className="row-header">
            <h3>🎉 Đã xong ({requests.filter(r => r.status === 'completed').length})</h3>
          </div>
          <div className="row-content">
            {requests.filter(r => r.status === 'completed').map(req => (
              <div key={req.id} className="request-card completed-card">
                 <div className="card-info">
                    <h4>{req.name}</h4>
                    <p>Người cứu: {req.rescuerName}</p>
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