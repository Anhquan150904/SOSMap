// src/pages/AdminDashboard.jsx
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const API_BASE = "http://localhost:5075/api";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("requests");
  
  // Dữ liệu
  const [pendingVolunteers, setPendingVolunteers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [reports, setReports] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  
  // [MỚI] State lưu danh sách yêu cầu hủy task
  const [cancelRequests, setCancelRequests] = useState([]); 

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("accessToken");
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      // 1. Lấy danh sách User (Giữ nguyên)
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

      // 2. Lấy danh sách Reports
      let allReports = [];
      try {
        const [resPending, resAccepted, resInProcess, resDone] = await Promise.all([
            axios.get(`${API_BASE}/reports/status/Pending`, config).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/Accepted`, config).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/InProcess`, config).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/Done`, config).catch(() => ({ data: [] }))
        ]);

        allReports = [
            ...(resPending.data || []),
            ...(resAccepted.data || []),
            ...(resInProcess.data || []),
            ...(resDone.data || [])
        ];

        const sortedReports = allReports.sort((a, b) => (b.id || 0) - (a.id || 0));
        setReports(sortedReports);
      } catch (errReport) {
        console.error("Lỗi tải Reports:", errReport);
      }

      // 3. [CHIẾN THUẬT MỚI] LẤY TASK CỦA TỪNG REPORT ĐỂ KIỂM TRA HỦY
      // Vì Report không chứa info Task, ta phải gọi API lấy Task cho từng Report đang chạy
      try {
        // Chỉ cần check các đơn đang thực hiện (Accepted, InProcess)
        const activeReports = allReports.filter(r => 
            r.status === 'Accepted' || 
            r.status === 'InProcess' || 
            r.status === 'accepted' || 
            r.status === 'inprocess'
        );

        // Gọi API lấy task song song cho tất cả các đơn này
        const taskPromises = activeReports.map(async (report) => {
            try {
                // API: /api/reports/tasks/gettask/{reportId}
                const res = await axios.get(`${API_BASE}/reports/tasks/gettask/${report.id}`, config);
                const task = res.data; // Task trả về từ Backend
                
                if (task) {
                    // Gắn thêm thông tin Report vào object Task để hiển thị
                    return { 
                        ...task, 
                        reportId: report.id, 
                        reportName: report.name 
                    };
                }
                return null;
            } catch (e) {
                // Nếu report chưa có task hoặc lỗi thì bỏ qua
                return null;
            }
        });

        const tasks = await Promise.all(taskPromises);

        // Lọc ra các Task có status là 'pending-to-canceled'
        const requests = tasks.filter(t => {
            if (!t) return false;
            const status = t.status ? String(t.status).toLowerCase() : "";
            return status === 'pending-to-canceled' || status === 'pendingtocanceled';
        });

        console.log("⚠️ Đã tìm thấy Task hủy:", requests);
        setCancelRequests(requests);

      } catch (errTask) {
        console.error("Lỗi khi quét Tasks:", errTask);
      }

    } catch (error) {
      console.error("Lỗi chung:", error);
    }
  };

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

  const handleApproveReport = async (report) => {
    if (!window.confirm(`Duyệt đơn cứu trợ của: ${report.name}?`)) return;
    setIsLoading(true);
    try {
      await axios.post(
        `${API_BASE}/admin/report/${report.id}/accept-to-sos-report`, 
        {}, 
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );
      alert("✅ Đã duyệt đơn cứu trợ thành công!");
      fetchData(); 
    } catch (error) {
      console.error("Lỗi duyệt đơn:", error);
      alert("❌ Lỗi khi duyệt đơn.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- [UPDATE] XỬ LÝ XÁC NHẬN HỦY TASK ---
  const handleConfirmCancelTask = async (task) => {
    // Lưu ý: Task lấy từ API gettask đôi khi field VolunteerId viết hoa/thường khác nhau
    const volId = task.volunteerId || task.VolunteerId;

    if (!task.id || !volId) {
      alert(`❌ Lỗi dữ liệu: Thiếu thông tin.\nTaskID: ${task.id}\nVolID: ${volId}`);
      return;
    }

    if (!window.confirm(`Xác nhận hủy Task ID: ${task.id} \ncủa Volunteer: ${volId}?`)) return;

    setIsLoading(true);
    try {
      const url = `${API_BASE}/admin/tasks/${task.id}/cancel?volunteerId=${volId}`;
      console.log("🚀 Calling API:", url); 

      await axios.post(
        url,
        {}, 
        { headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` } }
      );

      alert("✅ Đã chấp nhận hủy Task thành công!");
      fetchData(); 
    } catch (err) {
      console.error("Lỗi hủy task:", err);
      const msg = err.response?.data?.message || err.message;
      alert(`❌ Lỗi: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
    navigate("/admin-login");
  };

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

            {/* 2. DUYỆT YÊU CẦU HỦY TASK (Đã dùng API gettask riêng) */}
            <div className="section-block" style={{ borderLeft: '5px solid #ef4444' }}>
               <h3>⚠️ Yêu cầu hủy nhiệm vụ (Volunteer)</h3>
               {renderTable(
                 cancelRequests,
                 ["Mã Report", "Volunteer ID", "Lý do hủy (Note)", "Thời gian", "Hành động"],
                 (task, idx) => (
                   <tr key={task.id || idx}>
                     <td>
                       <strong>{task.reportName || 'N/A'}</strong><br/>
                       <small>Report ID: {task.reportId}</small>
                     </td>
                     <td>
                       <code style={{fontSize: '0.8rem'}}>{(task.volunteerId || task.VolunteerId)?.substring(0, 8)}...</code>
                     </td>
                     <td>
                       <span style={{ color: '#d97706', fontWeight: 'bold' }}>
                         "{task.note || 'Không có'}"
                       </span>
                     </td>
                     <td>
                       {task.updatedAt ? new Date(task.updatedAt).toLocaleString('vi-VN') : '-'}
                     </td>
                     <td>
                       <button 
                         className="btn-small" 
                         onClick={() => handleConfirmCancelTask(task)}
                         disabled={isLoading}
                         style={{background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer'}}
                       >
                         {isLoading ? "..." : "Đồng ý Hủy"}
                       </button>
                     </td>
                   </tr>
                 )
               )}
            </div>
            
            {/* 3. DANH SÁCH ĐƠN CỨU TRỢ */}
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
                        <span className={`badge status-${rpt.status}`} 
                              style={{
                                background: rpt.status === 'pending' ? '#fef3c7' : rpt.status === 'accepted' ? '#d1fae5' : '#f3f4f6',
                                color: rpt.status === 'pending' ? '#b45309' : rpt.status === 'accepted' ? '#065f46' : '#374151'
                              }}>
                            {rpt.status}
                        </span>
                     </td>
                     <td>
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