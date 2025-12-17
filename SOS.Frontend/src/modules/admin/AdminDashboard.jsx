// src/pages/AdminDashboard.jsx
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const API_BASE = "http://localhost:5075/api";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("requests"); // 'requests' | 'users'
  
  // Dữ liệu
  const [pendingVolunteers, setPendingVolunteers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [reports, setReports] = useState([]); // [MỚI] Danh sách đơn cứu trợ
  const [isLoading, setIsLoading] = useState(false);

  // --- 1. LOAD DỮ LIỆU TỔNG HỢP ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("accessToken");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      // A. Lấy danh sách User (Logic cũ - Giữ nguyên)
      try {
        const resPending = await axios.get(`${API_BASE}/user/by-status/Pending`, config);
        const listPending = resPending.data || [];
        setPendingVolunteers(listPending.filter(u => u.role === 'volunteer'));

        const resActive = await axios.get(`${API_BASE}/user/by-status/active`, config);
        const listActive = resActive.data || [];
        setAllUsers([...listPending, ...listActive]);
      } catch (errUser) {
        console.error("Lỗi tải User:", errUser);
      }

      // B. [FIX] Lấy danh sách Đơn Cứu Trợ (Reports)
      // Thay vì gọi /api/reports (bị lỗi 400), ta gọi từng status rồi gộp lại
      try {
        // Các status phổ biến: Pending (Chờ), Accepted (Đã nhận), Done (Xong), Cancelled (Hủy)
        // Dùng Promise.all để gọi song song cho nhanh
        const [resPending, resAccepted, resInProcess, resDone] = await Promise.all([
            axios.get(`${API_BASE}/reports/status/Pending`, config).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/Accepted`, config).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/InProcess`, config).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/Done`, config).catch(() => ({ data: [] }))
        ]);

        // Gộp tất cả lại
        const allReports = [
            ...(resPending.data || []),
            ...(resAccepted.data || []),
            ...(resInProcess.data || []),
            ...(resDone.data || [])
        ];

        // Sắp xếp theo ID giảm dần (mới nhất lên đầu)
        // Hoặc theo ngày tạo nếu có field created_at
        const sortedReports = allReports.sort((a, b) => (b.id || 0) - (a.id || 0));
        
        setReports(sortedReports);
        console.log("📦 Danh sách đơn cứu trợ (Đã fix):", sortedReports);

      } catch (errReport) {
        console.error("Lỗi tải Reports:", errReport);
      }

    } catch (error) {
      console.error("Lỗi chung:", error);
    }
  };

  // --- 2. XỬ LÝ DUYỆT USER (Giữ nguyên) ---
  const handleApproveVolunteer = async (user) => {
    if (!window.confirm(`Duyệt thành viên ${user.fullName} làm Tình Nguyện Viên?`)) return;
    setIsLoading(true);
    try {
      const targetId = user.id || user.userId;
      await axios.post(`${API_BASE}/admin/user/${targetId}/accept-to-volunteer`, {}, 
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );
      alert("✅ Duyệt User thành công!");
      fetchData();
    } catch (error) {
      alert("Lỗi khi duyệt User.");
    } finally { setIsLoading(false); }
  };

  // --- 3. [MỚI] XỬ LÝ DUYỆT ĐƠN CỨU TRỢ ---
  const handleApproveReport = async (report) => {
    if (!window.confirm(`Duyệt đơn cứu trợ của: ${report.name}?`)) return;
    
    setIsLoading(true);
    try {
      // Gọi API: POST /api/admin/reports/{reportId}/accept
      await axios.post(
        `${API_BASE}/admin/report/${report.id}/accept-to-sos-report`, 
        {}, // Body rỗng
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );

      alert("✅ Đã duyệt đơn cứu trợ thành công!");
      fetchData(); // Load lại danh sách để cập nhật trạng thái

    } catch (error) {
      console.error("Lỗi duyệt đơn:", error);
      alert("❌ Lỗi khi duyệt đơn. Vui lòng thử lại.");
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
            <tr><td colSpan={columns.length} style={{ textAlign: "center", padding: "20px", color: '#999' }}>Không có dữ liệu</td></tr>
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
        
        {/* TAB 1: QUẢN LÝ (Gồm User Pending & Reports) */}
        {activeTab === "requests" && (
          <div className="requests-section">
            
            {/* 1. DUYỆT TÌNH NGUYỆN VIÊN */}
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
                      <button className="btn-small btn-primary" onClick={() => handleApproveVolunteer(vol)} disabled={isLoading}>
                        {isLoading ? "..." : "Chấp thuận"}
                      </button>
                    </td>
                  </tr>
                )
              )}
            </div>
            
            {/* 2. [MỚI] DANH SÁCH ĐƠN CỨU TRỢ */}
            <div className="section-block">
               <h3>📋 Tất Cả Đơn Cứu Trợ</h3>
               {renderTable(
                 reports,
                 ["Người gửi", "Mức độ / Chi tiết", "Địa chỉ", "Trạng thái", "Hành động"],
                 (rpt, idx) => (
                   <tr key={rpt.id || idx}>
                     <td>
                        <strong>{rpt.name}</strong><br/>
                        <small>{rpt.phone}</small>
                     </td>
                     <td>
                        <span className="badge" style={{background: '#e0f2fe', color: '#0369a1', marginRight: '5px'}}>{rpt.level}</span>
                        <br/>
                        <span style={{fontSize: '0.85rem', color: '#555'}}>{rpt.details}</span>
                     </td>
                     <td style={{maxWidth: '200px'}}>{rpt.address}</td>
                     <td>
                        {/* Hiển thị badge màu tùy theo status */}
                        <span className={`badge status-${rpt.status}`} 
                              style={{
                                background: rpt.status === 'pending' ? '#fef3c7' : rpt.status === 'accepted' ? '#d1fae5' : '#f3f4f6',
                                color: rpt.status === 'pending' ? '#b45309' : rpt.status === 'accepted' ? '#065f46' : '#374151'
                              }}>
                            {rpt.status}
                        </span>
                     </td>
                     <td>
                        {/* Chỉ hiện nút Duyệt nếu đơn đang Pending */}
                        {(rpt.status === 'pending' || rpt.status === 'Pending') && (
                            <button 
                                className="btn-small btn-success" 
                                onClick={() => handleApproveReport(rpt)}
                                disabled={isLoading}
                                style={{background: '#16a34a', color: 'white', border:'none', padding: '6px 12px', borderRadius: '4px', cursor:'pointer'}}
                            >
                                Duyệt Đơn
                            </button>
                        )}
                        {(rpt.status === 'accepted' || rpt.status === 'Accepted') && (
                            <span style={{color: 'green', fontWeight: 'bold'}}>✓ Đã duyệt</span>
                        )}
                     </td>
                   </tr>
                 )
               )}
            </div>
          </div>
        )}

        {/* TAB 2: DANH SÁCH USER */}
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
                  <td><span className={`badge role-${u.role}`}>{u.role}</span></td>
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