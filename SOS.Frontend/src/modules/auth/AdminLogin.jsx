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
      
      alert(`Đã gửi mã OTP đến ${phone}. (Check Console Server để lấy mã)`);
      setStep('INPUT_OTP'); 

    } catch (error) {
      console.error("Lỗi gửi OTP:", error);
      alert("Không thể gửi OTP. Vui lòng kiểm tra lại server.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. XÁC THỰC ADMIN (CÓ FIX ROLE) ---
  const handleVerifyLogin = async () => {
    if (!otp) { alert("Vui lòng nhập mã OTP"); return; }

    try {
      setIsLoading(true);

      // Gọi API Verify
      const res = await axios.post(`${API_BASE}/auth/verify-otp`, {
        phone: phone,
        code: otp,
        fullName: "" 
      });

      // Lấy dữ liệu user từ response (xử lý cả trường hợp lồng nhau)
      let userData = res.data.user || res.data;

      console.log("Kết quả đăng nhập (Sau khi fix):", userData);

      // --- KIỂM TRA QUYỀN ADMIN ---
      if (userData.role !== 'admin') {
        alert("⛔ LỖI: Tài khoản này không có quyền Admin!");
        setIsLoading(false);
        return;
      }

      // Lưu thông tin vào LocalStorage
      if (res.data.token) localStorage.setItem('accessToken', res.data.token);
      localStorage.setItem('currentUser', JSON.stringify(userData));

      alert(`Chào mừng Admin ${userData.fullName || ""} quay trở lại!`);
      
      // Chuyển hướng vào trang Dashboard
      navigate('/admin-dashboard'); 

    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
      alert("Mã OTP không đúng hoặc lỗi hệ thống.");
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