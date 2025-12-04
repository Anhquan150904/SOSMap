// src/modules/auth/LoginForm.jsx
import React, { useState } from 'react';
import Modal from '../../components/Modal';

const LoginForm = ({ role, onClose, onSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState(false);

  const handleSendOtp = () => {
    if (!phoneNumber) return alert("Vui lòng nhập số điện thoại");
    console.log(`Đang gửi OTP đến ${phoneNumber}...`);
    setSentOtp(true);
  };

  const handleVerifyOtp = () => {
    if (otp !== '123456') return alert("Mã OTP sai (Demo: 123456)");
    // Truyền số điện thoại ra ngoài cho App xử lý tiếp
    onSuccess(phoneNumber); 
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
          disabled={sentOtp}
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
          <span className="error-msg">Demo: Nhập 123456</span>
        </div>
      )}

      {!sentOtp ? (
        <button className="btn-primary" onClick={handleSendOtp}>Gửi mã OTP</button>
      ) : (
        <button className="btn-primary" onClick={handleVerifyOtp}>Xác nhận</button>
      )}
    </Modal>
  );
};

export default LoginForm;