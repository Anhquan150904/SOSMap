// src/modules/auth/LoginForm.jsx
import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import { authApi } from '../../service/AuthService';
// KHÔNG import useNavigate nữa, vì LoginPage sẽ lo việc chuyển trang

const LoginForm = ({ role, onClose, onSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!phoneNumber) return alert("Vui lòng nhập số điện thoại");
    try {
      setIsLoading(true);
      await authApi.sendOtp(phoneNumber);
      alert(`Đã gửi mã OTP. Kiểm tra Network tab nếu đang dev.`);
      setSentOtp(true);
      setCountdown(60);
    } catch (error) {
      console.error(error);
      alert("Lỗi gửi OTP: " + (error.response?.data?.message || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return alert("Vui lòng nhập mã OTP");

    try {
      setIsLoading(true);

      // 1. Gọi API Backend để lấy Token
      const response = await authApi.verifyOtp(phoneNumber, otp, role);
      
      // 2. Lưu Token từ Backend vào LocalStorage
      const { token, user } = response.data; // Tùy cấu trúc trả về của API
      if(token) localStorage.setItem('accessToken', token);
      
      // Lưu ý: Backend trả về user, nhưng LoginPage lại check logic theo USER_DATABASE giả lập
      // Nên ta cứ lưu tạm để dùng cho các việc khác
      if(user) localStorage.setItem('userProfile', JSON.stringify(user));

      alert("Xác thực OTP thành công!");

      // 3. QUAN TRỌNG: Gọi onSuccess để trả quyền điều khiển về cho LoginPage
      // LoginPage sẽ quyết định: Đã có trong DB -> Home, Chưa có -> Form Đăng ký
      if (onSuccess) {
        onSuccess(phoneNumber); 
      }
      
      // Không gọi navigate('/') ở đây nữa!
      
    } catch (error) {
      console.error(error);
      alert("Xác thực thất bại: " + (error.response?.data?.message || "Lỗi hệ thống"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal title="Đăng nhập / Đăng ký" onClose={onClose}>
      <p>Vai trò: <strong>{role === 'rescuee' ? 'Người cần cứu trợ' : 'Người cứu trợ'}</strong></p>

      <div className="form-group">
        <label>Số điện thoại</label>
        <input
          type="tel"
          placeholder="Nhập số điện thoại..."
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          disabled={sentOtp || isLoading} 
        />
      </div>

      {sentOtp && (
        <div className="form-group">
          <label>Mã xác thực (OTP)</label>
          <input
            type="text"
            placeholder="Nhập mã 6 số..."
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!sentOtp ? (
          <button className="btn-primary" onClick={handleSendOtp} disabled={isLoading}>
            {isLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
          </button>
        ) : (
          <>
            <button className="btn-primary" onClick={handleVerifyOtp} disabled={isLoading}>
              {isLoading ? 'Đang kiểm tra...' : 'Xác nhận'}
            </button>
            <button 
              type="button" onClick={handleSendOtp} disabled={isLoading || countdown > 0}
              style={{ background: 'transparent', border: 'none', color: countdown > 0 ? '#999' : '#007bff', cursor: countdown > 0 ? 'default' : 'pointer', textDecoration: 'underline' }}
            >
              {countdown > 0 ? `Gửi lại mã sau ${countdown}s` : 'Chưa nhận được mã? Gửi lại OTP'}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
};

export default LoginForm;