import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RoleSelection from './RoleSelection';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const LoginPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('ROLE_SELECT');
  const [role, setRole] = useState(null);
  const [tempPhone, setTempPhone] = useState('');

  // Style căn giữa màn hình cho trang Login
  const loginStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #e0e7ff 0%, #f3f4f6 100%)',
    padding: '20px'
  };

  const handleSelectRole = (selectedRole) => {
    setRole(selectedRole);
    setStep('PHONE_OTP');
  };

  // 1. XỬ LÝ ĐĂNG NHẬP (OTP)
  const handleLoginSuccess = (phoneNumber) => {
    setTempPhone(phoneNumber);
    
    // --- LOGIC MỚI: KIỂM TRA "DATABASE" ---
    // Lấy danh sách user đã từng đăng ký trong máy
    const userDB = JSON.parse(localStorage.getItem('USER_DATABASE') || '{}');
    
    // Nếu sđt này đã tồn tại -> Đăng nhập luôn với tên cũ
    if (userDB[phoneNumber]) {
      const user = userDB[phoneNumber];
      localStorage.setItem('currentUser', JSON.stringify(user)); // Lưu phiên đăng nhập
      navigate('/home');
    } else {
      // Nếu chưa có -> Chuyển sang form Đăng Ký
      setStep('REGISTER');
    }
  };

  // 2. XỬ LÝ ĐĂNG KÝ (HỌ TÊN)
  const handleRegisterSuccess = (userData) => {
    // userData bao gồm: { fullName, dob, phoneNumber }
    
    const newUser = { 
      name: userData.fullName, // <--- LẤY TÊN THẬT TỪ FORM
      phone: userData.phoneNumber,
      role: role 
    };

    // --- LOGIC MỚI: LƯU VÀO "DATABASE" ---
    // 1. Lưu vào danh sách user tổng để lần sau đăng nhập nhớ tên
    const userDB = JSON.parse(localStorage.getItem('USER_DATABASE') || '{}');
    userDB[userData.phoneNumber] = newUser;
    localStorage.setItem('USER_DATABASE', JSON.stringify(userDB));

    // 2. Lưu vào phiên đăng nhập hiện tại
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    
    navigate('/home');
  };

  const handleClose = () => {
    setStep('ROLE_SELECT');
    setRole(null);
  };

  return (
    <div style={loginStyle}>
      {step === 'ROLE_SELECT' && <RoleSelection onSelectRole={handleSelectRole} />}
      
      {step === 'PHONE_OTP' && (
        <LoginForm role={role} onClose={handleClose} onSuccess={handleLoginSuccess} />
      )}
      
      {step === 'REGISTER' && (
        <RegisterForm phoneNumber={tempPhone} onClose={handleClose} onRegister={handleRegisterSuccess} />
      )}
    </div>
  );
};

export default LoginPage;