// src/modules/about/AboutPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../home/HomePage.css"; // Tái sử dụng CSS của HomePage cho header/footer

const AboutPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Chỉ giữ lại logic lấy thông tin user để hiển thị Header
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Xử lý đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("user"); // Đảm bảo key giống với lúc setItem (thường là 'user')
    navigate("/");
  };

  return (
    <div className="homepage">
      {/* HEADER */}
      <header className="site-header">
        <div className="logo-area">
          <div className="logo-group" onClick={() => navigate("/home")}>
            <span className="logo-icon">🚨</span>
            <span className="logo-text">Cứu Hộ</span>
          </div>
          {/* Đã xóa phần chọn tỉnh thành ở đây */}
        </div>

        <nav className="main-nav">
          <a onClick={() => navigate("/home")}>Trang chủ</a>
          <a onClick={() => navigate("/map")}>Bản đồ</a>
          <a href="#" className="active">
            Liên hệ
          </a>

          {/* KHU VỰC TÀI KHOẢN */}
          {user ? (
            <div
              className="user-profile"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <span className="user-name">
                Xin chào, <strong>{user.name}</strong> ▾
              </span>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="dropdown-menu">
                  <div className="dropdown-item" onClick={handleLogout}>
                    Đăng xuất
                  </div>
                </div>
              )}
            </div>
          ) : (
            <a href="/" style={{ color: "#007bff" }}>
              Đăng nhập
            </a>
          )}
        </nav>
      </header>

      {/* HERO SECTION - Sửa lại nội dung cho phù hợp trang About */}
      <section className="hero-section" style={{ minHeight: "40vh" }}>
        <div className="hero-content">
          <h1>Về Dự Án Cứu Hộ</h1>
          <p>
            Kết nối những tấm lòng vàng với những hoàn cảnh khó khăn. Nền tảng
            công nghệ hỗ trợ ứng phó thiên tai kịp thời và minh bạch.
          </p>
        </div>
      </section>

      {/* SECTION: SỨ MỆNH (Thêm vào cho đầy đủ nội dung About) */}
      <section className="team-section">
        <h2>Sứ mệnh của chúng tôi</h2>
        <div
          className="team-grid"
          style={{
            display: "block",
            maxWidth: "800px",
            margin: "0 auto",
            textAlign: "justify",
          }}
        >
          <p>
            Dự án được thành lập với mục tiêu xây dựng một bản đồ số trực quan,
            giúp các đội cứu hộ xác định vị trí người gặp nạn nhanh chóng, đồng
            thời giúp các mạnh thường quân phân bổ nguồn lực cứu trợ hợp lý đến
            đúng nơi cần thiết.
          </p>
        </div>
      </section>

      {/* SECTION: ĐỘI NGŨ PHÁT TRIỂN */}
      <section className="team-section">
        <h2>Đội ngũ phát triển</h2>
        <div className="team-grid">
          {/* Bạn có thể hard-code thông tin thành viên ở đây */}
          <p>Updating...</p>
        </div>
      </section>

      {/* SECTION: ĐỘI NGŨ HỖ TRỢ */}
      <section className="team-section">
        <h2>Đội ngũ hỗ trợ và vận hành</h2>
        <div className="team-grid">
          <p>Updating...</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="site-footer">
        <h3>Các tổ chức, cá nhân đồng hành</h3>
        <div className="partners-list">
          <p>Updating...</p>
        </div>

        <div className="thank-you">
          <h2>Chân thành cảm ơn</h2>
          <p>Sự đóng góp của cộng đồng là động lực để chúng tôi phát triển.</p>
        </div>

        <div className="footer-bottom">
          <span>© 2025 Cứu Hộ App</span>
          <span>|</span>
          <button onClick={() => navigate("/home")}>Trang chủ</button>
          <span>|</span>
          <button onClick={() => navigate("/map")}>Bản đồ</button>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
