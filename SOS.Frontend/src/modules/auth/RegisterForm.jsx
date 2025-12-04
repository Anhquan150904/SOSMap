// src/modules/auth/RegisterForm.jsx
import React, { useState } from 'react';
import Modal from '../../components/Modal';

const RegisterForm = ({ phoneNumber, onClose, onRegister }) => {
  const [fullName, setFullName] = useState('');

  const handleSubmit = () => {
    if (!fullName) return alert("Vui lòng nhập đủ thông tin");
    onRegister({ fullName, phoneNumber });
  };

  return (
    <Modal title="Hoàn tất đăng ký" onClose={onClose}>
      <p>Số điện thoại chưa tồn tại. Vui lòng đăng ký.</p>

      <div className="form-group">
        <label>Số điện thoại</label>
        <input type="text" value={phoneNumber} readOnly />
      </div>

      <div className="form-group">
        <label>Họ và tên</label>
        <input
          type="text"
          placeholder="Nguyễn Văn A"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>

      <button className="btn-primary" onClick={handleSubmit}>
        Đăng ký và Đăng nhập
      </button>
    </Modal>
  );
};

export default RegisterForm;