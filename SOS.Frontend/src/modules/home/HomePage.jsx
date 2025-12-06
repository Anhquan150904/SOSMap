// src/modules/home/HomePage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css'; // Chúng ta sẽ tạo file CSS riêng cho trang này

const HomePage = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    console.log('user on HomePage:', user);
    // Khi trang load, lấy thông tin user từ localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
        setUser(JSON.parse(storedUser));
        }
    }, []);

    // Xử lý đăng xuất
    const handleLogout = () => {
        localStorage.removeItem('currentUser'); // Xóa user khỏi bộ nhớ
        navigate('/'); // Quay về trang đăng nhập
    };
    return (
        <div className="homepage">
        {/* HEADER */}
        <header className="site-header">
            <div className="logo-area">
                <div className="logo-group" onClick={() => navigate('/home')}>
                    <span className="logo-icon">🚨</span>
                    <span className="logo-text">Cứu Hộ</span>
                </div>

    {/* Phần chọn tỉnh thành giữ nguyên, tách biệt ra */}
    <div className="location-badge">Bình Định ▾</div>
            </div>
            
            <nav className="main-nav">
            <a href="#" className="active">Trang chủ</a>
            <a onClick={() => navigate('/map')}>Bản đồ</a>
            <a href="#">Liên hệ</a>

            {/* KHU VỰC TÀI KHOẢN (Thêm vào cuối nav) */}
            {user ? (
                <div className="user-profile" onClick={() => setShowDropdown(!showDropdown)}>
                <span className="user-name">Xin chào, <strong>{user.name}</strong> ▾</span>
                
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
                // Nếu chưa đăng nhập thì hiện nút Login (đề phòng)
                <a href="/" style={{color: '#007bff'}}>Đăng nhập</a>
            )}
            </nav>
        </header>

        {/* HERO SECTION (MÀU XANH) */}
        <section className="hero-section">
            <div className="hero-content">
            <h1>Thông Tin Cứu Hộ</h1>
            <p>
                Dự án cộng đồng nhằm thu thập và trực quan hóa thông tin liên quan đến cứu trợ,
                cứu nạn trong các trận thiên tai. Chúng tôi mong muốn mang đến cho cộng đồng
                một cái nhìn trực quan và kịp thời.
            </p>
            <button className="btn-hero" onClick={() => navigate('/map')}>Xem Bản Đồ</button>
            </div>
        </section>

        {/* SECTION: ĐỘI NGŨ PHÁT TRIỂN */}
        <section className="team-section">
            <h2>Đội ngũ phát triển</h2>
            <div className="team-grid">
                Updating
            </div>
        </section>

        {/* SECTION: ĐỘI NGŨ HỖ TRỢ */}
        <section className="team-section">
            <h2>Đội ngũ hỗ trợ và vận hành</h2>
            <div className="team-grid">
                Updating
            </div>
        </section>

        {/* FOOTER */}
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
                <button onClick={() => navigate('/map')}>Bản đồ</button>
            </div>
        </footer>
        </div>
    );
};

export default HomePage;