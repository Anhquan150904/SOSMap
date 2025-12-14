import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("requests"); // 'requests' | 'users'
  const [requests, setRequests] = useState([]);
  const [pendingVolunteers, setPendingVolunteers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    const storedReqs = localStorage.getItem("RELIEF_REQUESTS");
    if (storedReqs) setRequests(JSON.parse(storedReqs));

    const storedPendingVols = localStorage.getItem("VOLUNTEER_APPROVALS");
    if (storedPendingVols) setPendingVolunteers(JSON.parse(storedPendingVols));

    const userDB = JSON.parse(localStorage.getItem("USER_DATABASE") || "{}");
    setAllUsers(Object.values(userDB));
  }, []);

  // --- [UPDATE] GỬI THÔNG BÁO KÈM ROLE ---
  const sendNotification = (phoneNumber, message, role) => {
    const notis = JSON.parse(
      localStorage.getItem("SYSTEM_NOTIFICATIONS") || "[]"
    );
    notis.push({
      to: phoneNumber,
      targetRole: role, // Quan trọng: Xác định role nhận tin
      message: message,
      time: new Date().toLocaleString(),
      isRead: false,
    });
    localStorage.setItem("SYSTEM_NOTIFICATIONS", JSON.stringify(notis));
  };

  const handleApproveRequest = (id) => {
    const updatedRequests = requests.map((req) =>
      req.id === id ? { ...req, status: "approved" } : req
    );
    setRequests(updatedRequests);
    localStorage.setItem("RELIEF_REQUESTS", JSON.stringify(updatedRequests));
  };

  const handleApproveVolunteer = (volUser) => {
    const userDB = JSON.parse(localStorage.getItem("USER_DATABASE") || "{}");
    const oldKey = `${volUser.phone}_volunteer-pending`;
    const newKey = `${volUser.phone}_volunteer`;

    if (userDB[oldKey]) {
      const updatedUser = { ...userDB[oldKey], role: "volunteer" };
      delete userDB[oldKey];
      userDB[newKey] = updatedUser;
      localStorage.setItem("USER_DATABASE", JSON.stringify(userDB));
    }

    const newPendingList = pendingVolunteers.filter(
      (v) => v.phone !== volUser.phone
    );
    setPendingVolunteers(newPendingList);
    localStorage.setItem("VOLUNTEER_APPROVALS", JSON.stringify(newPendingList));

    // Gửi thông báo cho Volunteer
    sendNotification(
      volUser.phone,
      "🎉 Chúc mừng! Hồ sơ Tình nguyện viên của bạn đã được duyệt.",
      "volunteer"
    );
    alert(`Đã duyệt ${volUser.name} thành Tình nguyện viên!`);
  };

  const handleApproveCancel = (req) => {
    const confirm = window.confirm(
      `Bạn có chắc muốn cho phép hủy nhiệm vụ này không?`
    );
    if (!confirm) return;

    // 1. Gửi cho Volunteer (role: volunteer)
    sendNotification(
      req.rescuerPhone,
      `✅ Yêu cầu hủy nhiệm vụ cứu trợ "${req.name}" đã được chấp thuận.`,
      "volunteer"
    );

    // 2. Gửi cho Citizen (role: citizen)
    sendNotification(
      req.userId,
      `⚠️ Tình nguyện viên ${req.rescuerName} đã hủy hỗ trợ vì lý do: "${req.cancelReason}". Hệ thống đang tìm người khác.`,
      "citizen"
    );

    const updatedRequests = requests.map((r) =>
      r.id === req.id
        ? {
            ...r,
            status: "approved",
            rescuerName: null,
            rescuerPhone: null,
            rescuerLocation: null,
            cancelReason: null,
          }
        : r
    );
    setRequests(updatedRequests);
    localStorage.setItem("RELIEF_REQUESTS", JSON.stringify(updatedRequests));
  };

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  // --- HELPER: RENDER BẢNG DỮ LIỆU ---
  const renderTable = (data, columns, renderRow) => (
    <table className="adminf-table">
      <thead>
        <tr>
          {columns.map((col, idx) => (
            <th key={idx}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              style={{ textAlign: "center", padding: "20px" }}
            >
              Không có dữ liệu
            </td>
          </tr>
        ) : (
          data.map((item, idx) => renderRow(item, idx))
        )}
      </tbody>
    </table>
  );

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <h2>🛡️ Admin Control Center</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setActiveTab("requests")}
            style={{
              opacity: activeTab === "requests" ? 1 : 0.6,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              color: "white",
              fontWeight: "bold",
            }}
          >
            <h2>Quản lý Đơn</h2>
          </button>
          <button
            onClick={() => setActiveTab("users")}
            style={{
              opacity: activeTab === "users" ? 1 : 0.6,
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              color: "white",
              fontWeight: "bold",
            }}
          >
            <h2>Danh sách User</h2>
          </button>

          <button onClick={handleLogout} className="btn-logout">
            Đăng xuất
          </button>
        </div>
      </header>

      <div className="dashboard-container">
        {/* --- TAB 1: QUẢN LÝ ĐƠN --- */}
        {activeTab === "requests" && (
          <div className="requests-section">
            {/* 1. YÊU CẦU HỦY (Ưu tiên) */}
            <div className="section-block danger-block">
              <h3>🚨 Yêu Cầu Hủy Nhiệm Vụ</h3>
              
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>TNV Yêu Cầu</th>
                      <th>Nhiệm Vụ Đang Cứu</th>
                      <th style={{width: '30%'}}>Lý Do Hủy</th> {/* Cố định độ rộng cho lý do */}
                      <th>Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.filter((r) => r.status === "cancel_pending").length === 0 ? (
                      <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>Không có yêu cầu nào</td></tr>
                    ) : (
                      requests.filter((r) => r.status === "cancel_pending").map((req) => (
                        <tr key={req.id}>
                          <td>
                            <strong>{req.rescuerName}</strong>
                            <br />
                            <small>{req.rescuerPhone}</small>
                          </td>
                          <td>
                            <strong>{req.name}</strong>
                            <br/>
                            <small>{req.address}</small>
                          </td>
                          <td>
                            <span style={{ color: "#b91c1c", fontWeight: 500 }}>
                              "{req.cancelReason}"
                            </span>
                          </td>
                          <td>
                            <button className="btn-small btn-danger" onClick={() => handleApproveCancel(req)}>
                              Duyệt Hủy
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. DUYỆT TÌNH NGUYỆN VIÊN */}
            <div className="section-block info-block">
              <h3>❤️ Duyệt Tình Nguyện Viên Mới</h3>
              
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Họ Tên</th>
                      <th>Số Điện Thoại</th>
                      <th className="col-address">Địa Chỉ</th> {/* Dùng lại class col-address để cố định */}
                      <th>Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingVolunteers.length === 0 ? (
                      <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>Không có đăng ký mới</td></tr>
                    ) : (
                      pendingVolunteers.map((vol, idx) => (
                        <tr key={idx}>
                          <td><strong>{vol.name}</strong></td>
                          <td>{vol.phone}</td>
                          
                          {/* Cột địa chỉ sẽ tự động xuống dòng đẹp mắt */}
                          <td>{vol.address}</td>
                          
                          <td>
                            <button className="btn-small btn-primary" onClick={() => handleApproveVolunteer(vol)}>
                              Chấp thuận
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. DANH SÁCH ĐƠN CỨU TRỢ (Gộp tất cả trạng thái vào 1 bảng lớn) */}
            <div className="section-block">
              <h3>📋 Tất Cả Đơn Cứu Trợ</h3>
              
              {/* Thêm div table-container để bao bọc */}
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Người Cần Cứu</th>
                      <th className="col-address">Địa Chỉ</th> {/* Thêm class col-address vào đây */}
                      <th>Loại</th>
                      <th>Trạng Thái</th>
                      <th style={{textAlign: 'center'}}>TNV Phụ Trách</th>
                      <th>Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.filter((r) => r.status !== "cancel_pending").length === 0 ? (
                      <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>Không có dữ liệu</td></tr>
                    ) : (
                      requests
                        .filter((r) => r.status !== "cancel_pending")
                        .map((req) => (
                          <tr key={req.id}>
                            <td>
                              <strong>{req.name}</strong>
                              <br />
                              <small>{req.phone}</small>
                            </td>
                            
                            {/* Dữ liệu địa chỉ sẽ tuân theo width của header col-address */}
                            <td>{req.address}</td>
                            
                            <td>
                              <span className="badge badge-type">{req.type}</span>
                            </td>
                            
                            <td style={{ textAlign: "center" }}>
                              <span className={`badge status-${req.status}`}>
                                {req.status === "pending" ? "Chờ duyệt"
                                  : req.status === "approved" ? "Đang tìm TNV"
                                  : req.status === "in_progress" ? "Đang cứu hộ"
                                  : req.status === "canceled" ? "Hủy"
                                  : "Hoàn thành"}
                              </span>
                            </td>
                            
                            <td style={{ textAlign: "center" }}>
                              {req.rescuerName ? req.rescuerName : "—"}
                            </td>
                            
                            <td>
                              {req.status === "pending" && (
                                <button className="btn-small btn-success" onClick={() => handleApproveRequest(req.id)}>
                                  Duyệt Đơn
                                </button>
                              )}
                              {req.status === "canceled" && <span style={{ color: "red", fontSize: '0.8rem' }}>Đã hủy</span>}
                              {(req.status === "successfully_completed" || req.status === "completed") && (
                                <span style={{ color: "green", fontWeight: 'bold', fontSize: '0.8rem' }}>✓ Hoàn thành</span>
                              )}
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: DANH SÁCH USER --- */}
        {activeTab === "users" && (
          <div className="section-block">
            <h3>👥 Danh sách người dùng hệ thống</h3>
            {renderTable(
              allUsers,
              [
                "Họ Tên",
                "Số Điện Thoại",
                "Vai Trò",
                "Địa Chỉ",
                "Ngày Tham Gia",
              ],
              (u, idx) => (
                <tr key={idx}>
                  <td>
                    <strong>{u.name}</strong>
                  </td>
                  <td>{u.phone}</td>
                  <td>
                    <span className={`badge role-${u.role}`}>
                      {u.role === "citizen"
                        ? "Người Dân"
                        : u.role === "volunteer"
                        ? "Tình Nguyện Viên"
                        : u.role === "volunteer-pending"
                        ? "TNV (Chờ duyệt)"
                        : "Admin"}
                    </span>
                  </td>
                  <td>{u.address || "N/A"}</td>
                  <td>{u.joinedAt || "N/A"}</td>
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
