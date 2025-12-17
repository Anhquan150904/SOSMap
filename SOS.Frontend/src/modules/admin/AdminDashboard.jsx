// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminDashboard.css";

const API_BASE = "http://localhost:5075/api";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("requests");
  const [pendingVolunteers, setPendingVolunteers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. LOAD DỮ LIỆU ---
  useEffect(() => {
    fetchRealData();
  }, []);

  const fetchRealData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } };

      // 1. Lấy danh sách chờ duyệt (Pending)
      // Lưu ý: Tên status có thể phân biệt hoa thường, thử 'Pending' trước
      const resPending = await axios.get(`${API_BASE}/user/by-status/Pending`, config);
      const listPending = resPending.data || [];

      // Lọc ra những người đăng ký làm Volunteer
      const volunteersPending = listPending.filter(u => u.role === 'volunteer');
      setPendingVolunteers(volunteersPending);

      // 2. Lấy danh sách đang hoạt động (Active)
      // Để hiển thị bên tab "Danh sách User"
      const resActive = await axios.get(`${API_BASE}/user/by-status/active`, config);
      const listActive = resActive.data || [];

      // 3. Gộp lại để hiển thị tất cả
      // (Dùng Set hoặc Map để loại bỏ trùng lặp nếu có)
      const combinedUsers = [...listPending, ...listActive];
      
      // Sắp xếp ID giảm dần hoặc theo tên (tùy chọn)
      setAllUsers(combinedUsers);

      console.log("✅ Đã tải xong dữ liệu:", { pending: volunteersPending.length, total: combinedUsers.length });

    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
      // Nếu API trả lỗi 404 cho 'active', có thể thử 'Active' (viết hoa chữ A)
    }
  };

  // --- 2. XỬ LÝ DUYỆT (API THẬT) ---
  const handleApproveVolunteer = async (user) => {
    if (!window.confirm(`Duyệt thành viên ${user.fullName} làm Tình Nguyện Viên?`)) return;

    setIsLoading(true);
    try {
      // ID user có thể là id hoặc userId tùy API trả về
      const targetId = user.id || user.userId;
      console.log(`🚀 Đang duyệt ID: ${targetId}`);
      
      await axios.post(
        `${API_BASE}/admin/user/${targetId}/accept-to-volunteer`,
        {}, 
        {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            'Content-Type': 'application/json'
          }
        }
      );

      alert("✅ Duyệt thành công!");
      fetchRealData(); // Load lại danh sách

    } catch (error) {
      console.error("Lỗi duyệt:", error);
      alert("Lỗi khi duyệt. Kiểm tra lại console.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
    navigate("/admin-login");
  };

  // --- HELPER: RENDER TABLE ---
  const renderTable = (data, columns, renderRow) => (
    <div className="table-container">
      <table className="admin-table">
        <thead>
          <tr>{columns.map((col, idx) => <th key={idx}>{col}</th>)}</tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ textAlign: "center", padding: "20px" }}>Không có dữ liệu</td></tr>
          ) : (
            data.map((item, idx) => renderRow(item, idx))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h2>🛡️ Admin Control Center</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setActiveTab("requests")} style={{ opacity: activeTab === "requests" ? 1 : 0.6, background: "transparent", border: "none", color: "white", fontWeight: "bold", cursor: "pointer" }}><h2>Quản lý</h2></button>
          <button onClick={() => setActiveTab("users")} style={{ opacity: activeTab === "users" ? 1 : 0.6, background: "transparent", border: "none", color: "white", fontWeight: "bold", cursor: "pointer" }}><h2>Users</h2></button>
          <button onClick={handleLogout} className="btn-logout">Đăng xuất</button>
        </div>
      </header>

      <div className="dashboard-container">
        
        {/* TAB 1: QUẢN LÝ */}
        {activeTab === "requests" && (
          <div className="requests-section">
            <div className="section-block info-block">
              <h3>❤️ Duyệt Tình Nguyện Viên Mới</h3>
              {renderTable(
                pendingVolunteers,
                ["Họ Tên", "Số Điện Thoại", "Trạng Thái", "Hành Động"],
                (vol, idx) => (
                  <tr key={vol.id || idx}>
                    <td><strong>{vol.fullName}</strong></td>
                    <td>{vol.phone}</td>
                    <td><span className="badge" style={{background: '#fff7ed', color: '#c2410c'}}>{vol.status}</span></td>
                    <td>
                      <button 
                        className="btn-small btn-primary" 
                        onClick={() => handleApproveVolunteer(vol)}
                        disabled={isLoading}
                      >
                        {isLoading ? "..." : "Chấp thuận"}
                      </button>
                    </td>
                  </tr>
                )
              )}
            </div>
            
            <div className="section-block">
               <h3>📋 Tất Cả Đơn Cứu Trợ</h3>
               <div style={{padding:'20px', textAlign:'center', color:'#666'}}>(Đang cập nhật...)</div>
            </div>
          </div>
        )}

        {/* TAB 2: DANH SÁCH USER (ĐÃ FIX) */}
        {activeTab === "users" && (
          <div className="section-block">
            <h3>👥 Danh sách toàn bộ User</h3>
            {renderTable(
              allUsers,
              ["Họ Tên", "SĐT", "Vai Trò", "Trạng Thái"],
              (u, idx) => (
                <tr key={u.id || idx}>
                  <td><strong>{u.fullName}</strong></td>
                  <td>{u.phone}</td>
                  <td>
                    <span className={`badge role-${u.role}`}>
                        {u.role === 'citizen' ? 'Người Dân' : 
                         u.role === 'volunteer' ? 'TNV' : 
                         u.role === 'admin' ? 'Admin' : u.role}
                    </span>
                  </td>
                  <td>{u.status}</td>
                </tr>
              )
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;