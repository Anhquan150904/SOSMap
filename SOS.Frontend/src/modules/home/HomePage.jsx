import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./HomePage.css"; 

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]); 
  
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);

  const [provinces, setProvinces] = useState([]);
  const [currentProvince, setCurrentProvince] = useState(null);
  const [showLocaDropdown, setShowLocaDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- LOGIC 1: LOAD USER VÀ LỌC THÔNG BÁO ---
  useEffect(() => {
    const sessionUserStr = localStorage.getItem("currentUser");
    
    if (sessionUserStr) {
      let currentUser = JSON.parse(sessionUserStr);
      
      // Check lại role từ DB
      const userDB = JSON.parse(localStorage.getItem('USER_DATABASE') || '{}');
      const officialKey = `${currentUser.phone}_volunteer`;

      if (userDB[officialKey] && currentUser.role === 'volunteer-pending') {
          localStorage.setItem('currentUser', JSON.stringify(userDB[officialKey]));
          currentUser = userDB[officialKey];
      }
      setUser(currentUser);

      // --- [QUAN TRỌNG] LỌC THÔNG BÁO KỸ HƠN ---
      const allNotis = JSON.parse(localStorage.getItem('SYSTEM_NOTIFICATIONS') || '[]');
      
      const myNotis = allNotis.filter(n => {
          // 1. Phải đúng số điện thoại
          const isMyPhone = String(n.to) === String(currentUser.phone);
          
          // 2. Phải đúng vai trò (targetRole)
          // Nếu thông báo có targetRole thì phải khớp với role hiện tại
          const isMyRole = n.targetRole ? n.targetRole === currentUser.role : true;

          return isMyPhone && isMyRole;
      }).reverse();
      
      setNotifications(myNotis);
    }
  }, []);

  // API lấy tỉnh thành
  useEffect(() => {
    const fetchApiProvinces = async () => {
      try {
        const res = await fetch("https://provinces.open-api.vn/api/v2/?depth=1");
        const data = await res.json();
        setProvinces(data);
      } catch (error) {
        console.error("Lỗi API Tỉnh thành: ", error);
      }
    };
    fetchApiProvinces();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    navigate("/");
  };

  const handleChooseProvince = async (province) => {
    setCurrentProvince(province);
    setShowLocaDropdown(false);
    setIsLoading(true);
    try {
      const query = `${province.name}, Việt Nam`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        navigate("/map", { state: { position: [lat, lon], name: province.name } });
      } else {
        navigate("/map", { state: { name: province.name } });
      }
    } catch (error) {
      console.error("Lỗi ngầm định vị:", error);
      navigate("/map");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDisplayName = (role) => {
    switch(role) {
        case 'citizen': return 'Người Dân';
        case 'volunteer': return 'Tình Nguyện Viên';
        case 'volunteer-pending': return 'TNV (Chờ duyệt)';
        case 'admin': return 'Quản Trị Viên';
        default: return '';
    }
  };

  // --- [SỬA] HELPER: RENDER NỘI DUNG THÔNG BÁO ---
  const renderNotifications = () => {
    // Check role hiện tại
    const isPending = user?.role === 'volunteer-pending';
    const isOfficialVolunteer = user?.role === 'volunteer';
    const isCitizen = user?.role === 'citizen';

    const hasMessages = notifications.length > 0;

    // Nếu không có tin nhắn nào VÀ không phải là Volunteer đang chờ/mới duyệt
    if (!hasMessages && !isPending && !isOfficialVolunteer) {
        return (
            <div style={{ padding: '20px', color: '#999', fontStyle: 'italic', textAlign: 'center' }}>
                Không có thông báo mới.
            </div>
        );
    }

    return (
        <div>
            {/* 1. KHỐI TRẠNG THÁI HỒ SƠ (CHỈ HIỆN VỚI VOLUNTEER/PENDING) */}
            {/* Citizen tuyệt đối không thấy khối này */}
            
            {isPending && (
                <div style={{ padding: '15px', borderBottom: '1px solid #eee', backgroundColor: '#fff7ed' }}>
                    <div style={{ fontWeight: 'bold', color: '#b45309', marginBottom: '5px', fontSize: '0.9rem' }}>
                        ⏳ Trạng thái hồ sơ
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#333' }}>
                        Hồ sơ Tình nguyện viên của bạn đang chờ Admin xét duyệt.
                    </div>
                </div>
            )}

            {isOfficialVolunteer && (
                <div style={{ padding: '15px', borderBottom: '1px solid #eee', backgroundColor: '#f0fdf4' }}>
                    <div style={{ fontWeight: 'bold', color: '#15803d', marginBottom: '5px', fontSize: '0.9rem' }}>
                        ✅ Trạng thái hồ sơ
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#333' }}>
                        Bạn là Tình nguyện viên chính thức. Hãy sẵn sàng nhận nhiệm vụ!
                    </div>
                </div>
            )}

            {/* 2. DANH SÁCH THÔNG BÁO TỪ HỆ THỐNG (Dành cho cả Citizen và Volunteer) */}
            {/* Chỉ hiện những tin nhắn gửi đúng đến SĐT này */}
            {notifications.map((note, idx) => (
                <div key={idx} style={{ padding: '15px', borderBottom: '1px solid #eee', backgroundColor: '#fff' }}>
                    <div style={{ fontWeight: 'bold', color: '#007bff', marginBottom: '3px', fontSize:'0.9rem', display:'flex', justifyContent:'space-between' }}>
                        <span>🔔 Hệ thống</span>
                        <span style={{ fontSize: '0.7rem', color: '#999', fontWeight: 'normal' }}>{note.time.split(' ')[1]}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#333', lineHeight: '1.4' }}>
                        {note.message}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#999', marginTop:'5px' }}>
                        {note.time.split(' ')[0]}
                    </div>
                </div>
            ))}
            
            {/* Nếu Citizen không có tin nhắn nào */}
            {isCitizen && !hasMessages && (
                 <div style={{ padding: '20px', color: '#999', fontStyle: 'italic', textAlign: 'center' }}>
                    Không có thông báo mới.
                </div>
            )}
        </div>
    );
  };

  // Logic hiện chấm đỏ
  const hasNotification = (user?.role === 'volunteer-pending') || (notifications.length > 0);

  return (
    <div className="homepage">
      {/* LOADING */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div className="loading-text">Đang định vị...</div>
        </div>
      )}

      {/* HEADER */}
      <header className="site-header">
        <div className="logo-area">
          <div className="logo-group" onClick={() => navigate("/home")}>
            <span className="logo-icon">🚨</span>
            <span className="logo-text">Cứu Hộ</span>
          </div>

          <div className="box-location">
            <div
              className="location-badge"
              onClick={() => { setShowLocaDropdown(!showLocaDropdown); }}
            >
              {currentProvince ? currentProvince.name : "Chọn tỉnh"} ▾
            </div>

            {showLocaDropdown && (
              <div className="lst-provinces-drop">
                {provinces.length > 0 ? (
                  provinces.map((prov) => (
                    <div
                      key={prov.code}
                      onClick={() => handleChooseProvince(prov)}
                      className="imt-provinces"
                    >
                      {prov.name}
                    </div>
                  ))
                ) : (
                  <div className="imt-provinces">Đang tải dữ liệu...</div>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className="main-nav">
          <a href="#" className="active">Trang chủ</a>
          <a onClick={() => navigate("/map")}>Bản đồ</a>
          <a href="#">Liên hệ</a>

          {/* KHU VỰC TÀI KHOẢN & THÔNG BÁO */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginLeft: '10px' }}>
                
                {/* --- ICON THÔNG BÁO --- */}
                <div 
                    className="notification-icon" 
                    style={{ position: 'relative', cursor: 'pointer', fontSize: '1.2rem' }}
                    onClick={() => setShowNotiDropdown(!showNotiDropdown)}
                >
                    🔔
                    {hasNotification && (
                        <span style={{
                            position: 'absolute', top: '-2px', right: '-2px',
                            width: '10px', height: '10px', backgroundColor: '#dc2626',
                            borderRadius: '50%', border: '2px solid white'
                        }}></span>
                    )}

                    {/* DROPDOWN THÔNG BÁO */}
                    {showNotiDropdown && (
                        <div style={{
                            position: 'absolute', top: '35px', right: '-10px',
                            width: '320px', backgroundColor: 'white', 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: '8px',
                            zIndex: 1000, border: '1px solid #eee', overflow: 'hidden'
                        }}>
                            <div style={{ padding: '15px', borderBottom: '1px solid #eee', fontWeight: 'bold', background: '#f9fafb', fontSize: '1rem' }}>
                                Thông báo của bạn
                            </div>
                            <div className="notification-list" style={{maxHeight: '350px', overflowY: 'auto'}}>
                                {renderNotifications()}
                            </div>
                        </div>
                    )}
                </div>

                {/* --- USER PROFILE --- */}
                <div 
                    className="user-profile" 
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    style={{cursor: 'pointer'}}
                >
                    <span className="user-name">
                        Xin chào, <strong>{user.name}</strong> <small>({getRoleDisplayName(user.role)})</small> ▾
                    </span>
                    {showProfileDropdown && (
                        <div className="dropdown-menu">
                        <div className="dropdown-item" onClick={handleLogout}>Đăng xuất</div>
                        </div>
                    )}
                </div>
            </div>
          ) : (
            <a href="/" style={{ color: "#007bff" }}>Đăng nhập</a>
          )}
        </nav>
      </header>

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Thông Tin Cứu Hộ</h1>
          <p>
            Dự án cộng đồng nhằm thu thập và trực quan hóa thông tin liên quan
            đến cứu trợ, cứu nạn trong các trận thiên tai. Chúng tôi mong muốn
            mang đến cho cộng đồng một cái nhìn trực quan và kịp thời.
          </p>
          
          <button className="btn-hero" onClick={() => navigate("/map")}>
            Xem Bản Đồ
          </button>
        </div>
      </section>

      {/* CÁC SECTION KHÁC */}
      <section className="team-section">
        <h2>Đội ngũ phát triển</h2>
        <div className="team-grid">Updating</div>
      </section>

      <section className="team-section">
        <h2>Đội ngũ hỗ trợ và vận hành</h2>
        <div className="team-grid">Updating</div>
      </section>

      <footer className="site-footer">
        <h3>Các tổ chức, cá nhân</h3>
        <div className="partners-list">
          <p>Updating</p>
        </div>

        <div className="thank-you">
          <h2>Chân thành cảm ơn</h2>
          <p>Updating</p>
        </div>

        <div className="footer-bottom">
          <span>© 2025 Cứu Hộ App</span>
          <span>|</span>
          <button onClick={() => window.scrollTo(0, 0)}>Trang chủ</button>
          <span>|</span>
          <button onClick={() => navigate("/map")}>Bản đồ</button>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;