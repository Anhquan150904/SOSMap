// src/pages/AdminLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Cấu hình API
const API_BASE = "http://localhost:5075/api"; 

const AdminLogin = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [step, setStep] = useState('INPUT_PHONE'); // INPUT_PHONE | INPUT_OTP
  const [phone, setPhone] = useState('0987654321'); // Mặc định số Admin
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- STYLE ---
  const containerStyle = {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh', backgroundColor: '#f1f5f9',
    padding: '20px'
  };
  const cardStyle = {
    background: 'white', padding: '40px', borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px',
    textAlign: 'center'
  };
  const inputStyle = {
    width: '100%', padding: '12px', margin: '15px 0',
    border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '16px',
    outline: 'none'
  };
  const btnStyle = {
    width: '100%', padding: '12px', background: '#dc2626', color: 'white',
    border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer',
    fontWeight: 'bold', marginTop: '10px',
    opacity: isLoading ? 0.7 : 1
  };

  // --- 1. GỬI OTP ---
  const handleSendOtp = async () => {
    if (!phone) { alert("Vui lòng nhập số điện thoại"); return; }

    try {
      setIsLoading(true);
      await axios.post(
        `${API_BASE}/auth/send-otp`, 
        { phone: phone }, 
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      alert(`Đã gửi mã OTP đến ${phone}. (Kiểm tra Console Server để lấy mã)`);
      setStep('INPUT_OTP'); 

    } catch (error) {
      console.error("Lỗi gửi OTP:", error);
      alert("Không thể gửi OTP. Vui lòng kiểm tra lại server.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. XÁC THỰC ADMIN (KHÔNG CẦN TOKEN) ---
  const handleVerifyLogin = async () => {
    if (!otp) { alert("Vui lòng nhập mã OTP"); return; }

    try {
      setIsLoading(true);

      const payload = {
        phone: phone,
        code: otp,
        fullName: "Admin User" 
      };

      // Gọi API Verify
      const res = await axios.post(`${API_BASE}/auth/verify-otp`, payload);
      console.log("📥 Response Login:", res.data);

      // Lấy dữ liệu user
      const userData = res.data.user || res.data.currentUser || res.data; 

      // Chỉ cần có thông tin User là coi như thành công
      if (!userData) {
        alert("⚠️ Lỗi: Server không trả về thông tin người dùng!");
        setIsLoading(false);
        return; 
      }

      // Kiểm tra quyền Admin (Chấp nhận cả 'Admin' và 'admin')
      const userRole = userData.role ? userData.role.toLowerCase() : "";
      if (userRole !== 'admin') {
        alert("⛔ LỖI: Tài khoản này không có quyền Admin!");
        setIsLoading(false);
        return;
      }

      // LƯU THÔNG TIN USER (Bỏ qua Token)
      localStorage.setItem('currentUser', JSON.stringify(userData));
      
      // Nếu có token thì lưu cho vui, không có cũng không sao
      const token = res.data.token || res.data.accessToken;
      if (token) localStorage.setItem('accessToken', token);
      else localStorage.removeItem('accessToken');

      alert(`✅ Đăng nhập thành công! Chào ${userData.fullName || "Admin"}`);
      
      // Chuyển hướng sang Dashboard
      navigate('/admin-dashboard', { replace: true });

    } catch (error) {
      console.error("❌ Lỗi đăng nhập:", error);
      const serverMsg = error.response?.data?.message || error.message;
      alert(`❌ Đăng nhập thất bại: ${serverMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER ---
  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{color: '#b91c1c', marginBottom: '10px'}}>ADMIN PORTAL</h2>
        <p style={{color: '#64748b', fontSize: '0.9rem', marginBottom: '20px'}}>
          Đăng nhập hệ thống quản trị
        </p>

        {step === 'INPUT_PHONE' && (
          <div>
            <div style={{textAlign: 'left', marginBottom: '5px', fontWeight: '500', color: '#333'}}>Số điện thoại:</div>
            <input 
              style={inputStyle} 
              type="text" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Nhập SĐT Admin"
            />
            <button style={btnStyle} onClick={handleSendOtp} disabled={isLoading}>
              {isLoading ? "Đang gửi..." : "Gửi OTP"}
            </button>
          </div>
        )}

        {step === 'INPUT_OTP' && (
          <div>
            <div style={{textAlign: 'left', marginBottom: '5px', fontWeight: '500', color: '#333'}}>Mã OTP:</div>
            <input 
              style={{...inputStyle, textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold'}} 
              type="text" 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="------"
            />
            <button style={btnStyle} onClick={handleVerifyLogin} disabled={isLoading}>
              {isLoading ? "Đang xử lý..." : "Đăng Nhập"}
            </button>
            
            <p 
              style={{marginTop: '15px', color: '#666', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline'}}
              onClick={() => setStep('INPUT_PHONE')}
            >
              Quay lại
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;