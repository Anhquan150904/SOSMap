// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'; // File CSS chung (nếu cần)

// Import các trang
import LoginPage from './modules/auth/LoginPage';
import HomePage from './modules/home/HomePage';
import RoleSelection from './modules/auth/RoleSelection';

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
        </Routes>
      </div>
    </Router>
  );
}

export default App;