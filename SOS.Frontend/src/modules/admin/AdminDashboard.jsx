// src/pages/AdminDashboard.jsx
import axios from "axios";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
// --- 1. IMPORT CÁC THƯ VIỆN CẦN THIẾT CHO NOTIFICATION ---
import * as signalR from "@microsoft/signalr";
import { FaRegBell } from "react-icons/fa"; 
import "./AdminDashboard.css";

const API_BASE = "http://localhost:5075/api";
const SIGNALR_HUB_URL = "http://localhost:5075/SignalRHub";

const AdminDashboard = () => {
  const navigate = useNavigate();

  // --- 2. STATE QUẢN LÝ TAB & DỮ LIỆU ---
  const [activeTab, setActiveTab] = useState(() => {
      return localStorage.getItem("adminActiveTab") || "requests";
  });
  
  const [pendingVolunteers, setPendingVolunteers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [reports, setReports] = useState([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [cancelRequests, setCancelRequests] = useState([]); 

  // --- 3. STATE QUẢN LÝ NOTIFICATION (SIGNALR) ---
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  
  const connectionRef = useRef(null);
  const dropdownRef = useRef(null);

  // --- 4. LƯU TAB VÀO STORAGE KHI THAY ĐỔI ---
  useEffect(() => {
      localStorage.setItem("adminActiveTab", activeTab);
  }, [activeTab]);

  // --- 5. CHECK AUTH & KHỞI TẠO SIGNALR ---
  useEffect(() => {
    // A. KIỂM TRA ĐĂNG NHẬP
    const userStr = localStorage.getItem("currentUser");
    if (!userStr) {
        navigate("/admin-login");
        return;
    }

    let currentUser;
    try {
        currentUser = JSON.parse(userStr);
        const role = currentUser.role ? currentUser.role.toLowerCase() : "";
        if (role !== 'admin') {
            alert("Bạn không có quyền truy cập trang này!");
            navigate("/admin-login");
            return;
        }
    } catch (e) {
        navigate("/admin-login");
        return;
    }

    // Nếu Auth OK -> Tải dữ liệu lần đầu
    fetchData();

// B. CẤU HÌNH SIGNALR
    const setupSignalR = async () => {
        if (connectionRef.current) return;

        // 1. Đổi LogLevel thành Information để xem được log kết nối như file test
        const connection = new signalR.HubConnectionBuilder()
            .withUrl(SIGNALR_HUB_URL)
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information) 
            .build();

        connectionRef.current = connection;

        const addNotification = (title, details, type) => {
            const newNotif = {
                id: Date.now() + Math.random(),
                title,
                details: typeof details === 'object' ? JSON.stringify(details) : details,
                type,
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            };
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
        };

        // --- LẮNG NGHE SỰ KIỆN (EVENT LISTENERS) ---

        // [QUAN TRỌNG - MỚI THÊM] 1. ReportCreated: Khi dân gửi đơn
        connection.on("ReportCreated", (payload) => {
            console.log("📢 [Socket] ReportCreated:", payload);
            const rName = payload.name || payload.Name || "Người dân";
            const rPhone = payload.phone || payload.Phone || "";
            
            addNotification("📢 Có đơn cứu trợ mới!", `Từ: ${rName} - ${rPhone}`, "info");
            
            // Gọi lại API để danh sách đơn tự động cập nhật ngay lập tức
            fetchData(); 
        });

        // 2. TaskAccepted: Khi TNV nhận đơn
        connection.on("TaskAccepted", async (payload) => {
            console.log("🟢 [Socket] TaskAccepted:", payload);
            const volId = payload.volunteerId || payload.VolunteerId;
            let volName = "TNV (Chưa rõ tên)";

            if (volId) {
                try {
                    const res = await axios.get(`${API_BASE}/user/${volId}/get-user-by-id`);
                    const userData = res.data.user || res.data;
                    if (userData && userData.fullName) {
                        volName = userData.fullName;
                    }
                } catch (err) {
                    console.error("Không lấy được tên TNV:", err);
                }
            }

            addNotification("🟢 Đã có TNV nhận đơn", `TNV: ${volName} đã nhận nhiệm vụ.`, "success");
            fetchData();
        });

        // 3. NotifyAdminsTaskCompleted: Khi nhiệm vụ xong
        connection.on("NotifyAdminsTaskCompleted", payload => {
            console.log("✅ [Socket] TaskCompleted:", payload);
            const rId = payload.reportId || payload.ReportId;
            addNotification("✅ Nhiệm vụ hoàn thành", `Report ID: ${rId} đã xong.`, "success");
            fetchData();
        });

        // 4. VolunteerRequestTaskCanceled: Yêu cầu hủy (Cái này bạn đang chạy được)
        connection.on("VolunteerRequestTaskCanceled", (payload) => {
            console.log("🚨 [Socket] RequestCancel:", payload);
            const tId = payload.taskId || payload.TaskId;
            const note = payload.note || payload.Note || "Không có lý do";
            addNotification("⚠️ Yêu cầu hủy nhiệm vụ", `Task ID: ${tId}. Lý do: ${note}`, "warning");
            fetchData();
        });

        // 5. TaskCanceledApproved: Đã duyệt hủy
        connection.on("TaskCanceledApproved", payload => {
            console.log("❌ [Socket] CancelApproved:", payload);
            const tId = payload.taskId || payload.TaskId;
            addNotification("❌ Đã duyệt hủy nhiệm vụ", `Task ID: ${tId} đã hủy.`, "info");
            fetchData();
        });

        // KẾT NỐI VÀ JOIN GROUP
        try {
            await connection.start();
            console.log("✅ SignalR Connected (React)");

            const role = currentUser.role ? currentUser.role.toLowerCase() : "admin";
            const status = currentUser.status ? currentUser.status.toLowerCase() : "active";
            const userId = currentUser.id || currentUser.userId;

            console.log(`➡️ Đang Join Group: Role=${role}, ID=${userId}`);
            
            await connection.invoke("JoinByRoleAndStatus", role, status, userId);
        } catch (err) { 
            console.error("❌ SignalR Connect Error:", err); 
        }
    };

    setupSignalR();

    // Cleanup khi component unmount
    return () => {
        if (connectionRef.current) {
            connectionRef.current.stop();
            connectionRef.current = null;
        }
    };

  }, [navigate]); // Chỉ chạy 1 lần khi mount (và khi navigate thay đổi)

  // --- 6. XỬ LÝ CLICK OUTSIDE (ĐÓNG DROPDOWN THÔNG BÁO) ---
  useEffect(() => {
    function handleClickOutside(event) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setShowNotifDropdown(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  // --- 7. HÀM LẤY DỮ LIỆU TỪ API ---
  const fetchData = async () => {
    // Không dùng header Auth để tránh lỗi nếu backend không trả token
    const config = {}; 

    try {
      // Load User
      try {
        const resPending = await axios.get(`${API_BASE}/user/by-status/Pending`, config);
        const listPending = resPending.data || [];
        setPendingVolunteers(listPending.filter(u => u.role === 'volunteer'));

        const resActive = await axios.get(`${API_BASE}/user/by-status/active`, config);
        const listActive = resActive.data || [];
        setAllUsers([...listPending, ...listActive]);
      } catch (errUser) { console.error("Lỗi tải User:", errUser); }

      // Load Reports
      try {
        const [resPending, resAccepted, resInProcess, resDone] = await Promise.all([
            axios.get(`${API_BASE}/reports/status/Pending`, config).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/Accepted`, config).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/InProcess`, config).catch(() => ({ data: [] })),
            axios.get(`${API_BASE}/reports/status/Done`, config).catch(() => ({ data: [] }))
        ]);

        const allReports = [
            ...(resPending.data || []),
            ...(resAccepted.data || []),
            ...(resInProcess.data || []),
            ...(resDone.data || [])
        ];
        setReports(allReports.sort((a, b) => (b.id || 0) - (a.id || 0)));

        // Load Cancel Requests từ list Reports
        const activeReports = allReports.filter(r => r.status === 'Accepted' || r.status === 'InProcess' || r.status === 'accepted' || r.status === 'inprocess');
        
        const taskPromises = activeReports.map(async (report) => {
            try {
                const res = await axios.get(`${API_BASE}/reports/tasks/gettask/${report.id}`, config);
                if (res.data) return { ...res.data, reportId: report.id, reportName: report.name };
                return null;
            } catch (e) { return null; }
        });

        const tasks = await Promise.all(taskPromises);
        const requests = tasks.filter(t => {
            if (!t) return false;
            const status = t.status ? String(t.status).toLowerCase() : "";
            return status === 'pending-to-canceled' || status === 'pendingtocanceled';
        });
        setCancelRequests(requests);

      } catch (errReport) { console.error("Lỗi tải Reports/Tasks:", errReport); }

    } catch (error) { console.error("Lỗi chung:", error); }
  };

  // --- CÁC HÀM XỬ LÝ HÀNH ĐỘNG ---
  const handleApproveVolunteer = async (user) => {
    if (!window.confirm(`Duyệt thành viên ${user.fullName}?`)) return;
    setIsLoading(true);
    try {
      const targetId = user.id || user.userId;
      await axios.post(`${API_BASE}/admin/user/${targetId}/accept-to-volunteer`, {});
      alert("✅ Duyệt thành công!");
      fetchData();
    } catch (error) { alert("Lỗi khi duyệt."); } finally { setIsLoading(false); }
  };

  const handleApproveReport = async (report) => {
    if (!window.confirm(`Duyệt đơn: ${report.name}?`)) return;
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/admin/report/${report.id}/accept-to-sos-report`, {});
      alert("✅ Đã duyệt đơn!");
      fetchData(); 
    } catch (error) { alert("❌ Lỗi khi duyệt."); } finally { setIsLoading(false); }
  };

  const handleRejectReport = async (report) => {
    if (!window.confirm(`❌ TỪ CHỐI đơn: ${report.name}?`)) return;
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/admin/report/${report.id}/reject-to-sos-report`, {});
      alert("🚫 Đã từ chối!");
      fetchData(); 
    } catch (error) { alert("❌ Lỗi khi từ chối."); } finally { setIsLoading(false); }
  };

  const handleConfirmCancelTask = async (task) => {
    const volId = task.volunteerId || task.VolunteerId;
    if (!task.id || !volId) return alert("Thiếu thông tin Task/Volunteer");
    if (!window.confirm(`Đồng ý HỦY Task ID: ${task.id}?`)) return;
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/admin/tasks/${task.id}/cancel?volunteerId=${volId}`, {});
      alert("✅ Đã hủy Task!");
      fetchData(); 
    } catch (err) { alert(`❌ Lỗi: ${err.message}`); } finally { setIsLoading(false); }
  }

  const handleRejectCancelTask = async (task) => {
    const volId = task.volunteerId || task.VolunteerId;
    if (!task.id) return alert("Thiếu ID Task");
    if (!window.confirm(`🚫 Không chấp nhận hủy? Task sẽ tiếp tục.`)) return;
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE}/admin/tasks/${task.id}/no-cancel?volunteerId=${volId}`, {});
      alert("🚫 Đã từ chối hủy. Task tiếp tục!");
      fetchData(); 
    } catch (err) { alert(`❌ Lỗi: ${err.message}`); } finally { setIsLoading(false); }
  }

  const handleLogout = () => {
    localStorage.clear(); // Xóa user, token, tab history
    navigate("/admin-login");
  };

  const handleBellClick = () => {
      setShowNotifDropdown(!showNotifDropdown);
      setUnreadCount(0);
  };

  // --- RENDER TABLE HELPER ---
  const renderTable = (data, columns, renderRow) => (
    <div className="table-container">
      <table className="admin-table">
        <thead><tr>{columns.map((col, idx) => <th key={idx}>{col}</th>)}</tr></thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ textAlign: "center", padding: "20px", color: '#999' }}>Không có dữ liệu</td></tr>
          ) : ( data.map((item, idx) => renderRow(item, idx)) )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
            <h2>🛡️ Admin Control Center</h2>
            
            {/* --- KHU VỰC THÔNG BÁO (NOTIFICATION) --- */}
            <div className="notification-container" ref={dropdownRef}>
                <div className="bell-icon-wrapper" onClick={handleBellClick}>
                    <FaRegBell size={24} color="white" />
                    {unreadCount > 0 && (
                        <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                </div>

                {showNotifDropdown && (
                    <div className="notification-dropdown">
                        <div className="dropdown-header">Thông báo mới</div>
                        <div className="dropdown-body">
                            {notifications.length === 0 ? (
                                <p className="no-notif">Chưa có thông báo nào.</p>
                            ) : (
                                notifications.map((notif) => (
                                    <div key={notif.id} className={`notif-item ${notif.type}`}>
                                        <div className="notif-title">{notif.title}</div>
                                        <div className="notif-details">{notif.details}</div>
                                        <div className="notif-time">{notif.time}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            onClick={() => setActiveTab("requests")} 
            style={{ opacity: activeTab === "requests" ? 1 : 0.6, background: "transparent", border: "none", color: "white", fontWeight: "bold", cursor: "pointer", borderBottom: activeTab === "requests" ? "2px solid white" : "none" }}
          >
            <h2>Quản lý đơn</h2>
          </button>
          <button 
            onClick={() => setActiveTab("users")} 
            style={{ opacity: activeTab === "users" ? 1 : 0.6, background: "transparent", border: "none", color: "white", fontWeight: "bold", cursor: "pointer", borderBottom: activeTab === "users" ? "2px solid white" : "none" }}
          >
            <h2>Quản lý người dùng</h2>
          </button>
          <button onClick={handleLogout} className="btn-logout">Đăng xuất</button>
        </div>
      </header>

      <div className="dashboard-container" style={{marginTop: '60px'}}>
        {/* === TAB 1: QUẢN LÝ ĐƠN === */}
        {activeTab === "requests" && (
          <div className="requests-section">
            <div className="section-block info-block">
              <h3>❤️ Duyệt Tình Nguyện Viên Mới</h3>
              {renderTable(pendingVolunteers, ["Họ Tên", "Số Điện Thoại", "Trạng Thái", "Hành Động"], (vol, idx) => (
                  <tr key={vol.id || idx}>
                    <td><strong>{vol.fullName}</strong></td><td>{vol.phone}</td>
                    <td><span className="badge" style={{background: '#fff7ed', color: '#c2410c'}}>{vol.status}</span></td>
                    <td><button className="btn-small btn-primary" onClick={() => handleApproveVolunteer(vol)} disabled={isLoading}>{isLoading ? "..." : "Chấp thuận"}</button></td>
                  </tr>
              ))}
            </div>

            <div className="section-block" style={{ borderLeft: '5px solid #ef4444' }}>
               <h3>⚠️ Yêu cầu hủy nhiệm vụ (Volunteer)</h3>
               {renderTable(cancelRequests, ["Mã Report", "Volunteer ID", "Lý do", "Thời gian", "Hành động"], (task, idx) => (
                   <tr key={task.id || idx}>
                     <td><strong>{task.reportName}</strong><br/><small>ID: {task.reportId}</small></td>
                     <td><code style={{fontSize: '0.8rem'}}>{(task.volunteerId || task.VolunteerId)?.substring(0, 8)}...</code></td>
                     <td><span style={{ color: '#d97706', fontWeight: 'bold' }}>"{task.note || 'Không có'}"</span></td>
                     <td>{task.updatedAt ? new Date(task.updatedAt).toLocaleString('vi-VN') : '-'}</td>
                     <td><div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                           <button className="btn-small" onClick={() => handleConfirmCancelTask(task)} disabled={isLoading} style={{background: '#ef4444', color: 'white', padding: '6px 10px', borderRadius: '4px', border:'none', cursor:'pointer'}}>Đồng ý</button>
                           <button className="btn-small" onClick={() => handleRejectCancelTask(task)} disabled={isLoading} style={{background: '#64748b', color: 'white', padding: '6px 10px', borderRadius: '4px', border:'none', cursor:'pointer'}}>Từ chối</button>
                       </div></td>
                   </tr>
               ))}
            </div>
            
            <div className="section-block">
               <h3>📋 Tất Cả Đơn Cứu Trợ</h3>
               {renderTable(reports, ["Người gửi", "Mức độ / Chi tiết", "Địa chỉ", "Trạng thái", "Hành động"], (rpt, idx) => (
                   <tr key={rpt.id || idx}>
                     <td><strong>{rpt.name}</strong><br/><small>{rpt.phone}</small></td>
                     <td><span className="badge" style={{background: '#e0f2fe', color: '#0369a1', marginRight: '5px'}}>{rpt.level}</span><br/><span style={{fontSize: '0.85rem', color: '#555'}}>{rpt.details}</span></td>
                     <td style={{maxWidth: '200px'}}>{rpt.address}</td>
                     <td><span className={`badge status-${rpt.status}`} style={{background: rpt.status === 'pending' ? '#fef3c7' : rpt.status === 'accepted' ? '#d1fae5' : '#f3f4f6', color: rpt.status === 'pending' ? '#b45309' : rpt.status === 'accepted' ? '#065f46' : '#374151'}}>{rpt.status}</span></td>
                     <td style={{ minWidth: '160px' }}>
                        {(rpt.status === 'pending' || rpt.status === 'Pending') && (
                            <div style={{display: 'flex', gap: '8px', justifyContent: 'center'}}>
                                <button className="btn-action-approve" onClick={() => handleApproveReport(rpt)} disabled={isLoading} style={{background: '#16a34a', color: 'white', padding: '8px 16px', borderRadius: '6px', border:'none', cursor:'pointer', fontWeight:'600'}}>Duyệt</button>
                                <button className="btn-action-reject" onClick={() => handleRejectReport(rpt)} disabled={isLoading} style={{background: '#dc2626', color: 'white', padding: '8px 16px', borderRadius: '6px', border:'none', cursor:'pointer', fontWeight:'600'}}>Từ chối</button>
                            </div>
                        )}
                        {(rpt.status === 'accepted' || rpt.status === 'Accepted') && <div style={{textAlign: 'center'}}><span style={{color: 'green', fontWeight: 'bold'}}>✅ Đã duyệt</span></div>}
                     </td>
                   </tr>
               ))}
            </div>
          </div>
        )}

        {/* === TAB 2: QUẢN LÝ USER === */}
        {activeTab === "users" && (
          <div className="section-block">
            <h3>👥 Danh sách toàn bộ User</h3>
            {renderTable(allUsers, ["Họ Tên", "SĐT", "Vai Trò", "Trạng Thái"], (u, idx) => (
                <tr key={u.id || idx}>
                  <td><strong>{u.fullName}</strong></td><td>{u.phone}</td>
                  <td><span className={`badge role-${u.role}`}>{u.role}</span></td><td>{u.status}</td>
                </tr>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;