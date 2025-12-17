// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css"; // File CSS chung (nếu cần)

// Import các trang
import LoginPage from "./modules/auth/LoginPage";
import HomePage from "./modules/home/HomePage";
import RoleSelection from "./modules/auth/RoleSelection";
import MapPage from "./modules/map/MapPage";
import AdminLogin from "./modules/auth/AdminLogin";
import AdminDashboard from "./modules/admin/AdminDashboard";
import AboutPage from "./modules/about/AboutPage";
function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          {/* Đường dẫn mặc định (/) sẽ vào trang Login */}
          <Route path="/" element={<LoginPage />} />

          {/* Đường dẫn (/home) sẽ vào trang chủ */}
          <Route path="/home" element={<HomePage />} />

          {/* Đường dẫn (/role-selection) sẽ vào trang chọn vai trò */}
          <Route path="/role-selection" element={<RoleSelection />} />
          {/* Đường dẫn (/map) sẽ vào trang bản đồ */}
          <Route path="/map" element={<MapPage />} />
          {/* Đường dẫn (/admin-login) sẽ vào trang đăng nhập Admin */}
          <Route path="/admin-login" element={<AdminLogin />} />
          {/* Đường dẫn (/admin-dashboard) sẽ vào trang Dashboard Admin */}
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          {/* Đường dẫn (/about) sẽ vào trang trang about */}
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
