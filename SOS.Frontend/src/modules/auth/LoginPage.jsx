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

  const loginStyle = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: 'linear-gradient(135deg, #e0e7ff 0%, #f3f4f6 100%)', padding: '20px'
  };

  const handleSelectRole = (selectedRole) => {
    setRole(selectedRole);
    setStep('PHONE_OTP');
  };

  // 1. XỬ LÝ ĐĂNG NHẬP
  const handleLoginSuccess = (phoneNumber) => {
    setTempPhone(phoneNumber);
    
    // Tạo "Khóa duy nhất" kết hợp giữa SĐT và Role
    // Ví dụ: "0912345678_rescuee" hoặc "0912345678_rescuer"
    const uniqueKey = `${phoneNumber}_${role}`;

    const userDB = JSON.parse(localStorage.getItem('USER_DATABASE') || '{}');
    
    // Kiểm tra xem SĐT này VỚI ROLE NÀY đã tồn tại chưa
    if (userDB[uniqueKey]) {
      const existingUser = userDB[uniqueKey];
      
      // Đăng nhập thành công -> Lưu vào session
      localStorage.setItem('user', JSON.stringify(existingUser)); 
      navigate('/home');
    } else {
      // Nếu chưa có tài khoản cho Role này (dù SĐT có thể đã đk role kia)
      // -> Chuyển sang form Đăng Ký mới cho Role hiện tại
      setStep('REGISTER');
    }
  };

  // 2. XỬ LÝ ĐĂNG KÝ
  const handleRegisterSuccess = (userData) => {
    // userData: { fullName, phoneNumber, address, location }
    
    const newUser = { 
      name: userData.fullName, 
      phone: userData.phoneNumber,
      role: role, // Role hiện tại
      address: userData.address,   
      location: userData.location  
    };

    // Tạo khóa duy nhất
    const uniqueKey = `${userData.phoneNumber}_${role}`;

    // Lưu vào Database
    const userDB = JSON.parse(localStorage.getItem('USER_DATABASE') || '{}');
    userDB[uniqueKey] = newUser; // <--- Lưu theo key mới (SĐT_Role)
    localStorage.setItem('USER_DATABASE', JSON.stringify(userDB));

    // Lưu phiên làm việc
    localStorage.setItem('user', JSON.stringify(newUser));
    
    navigate('/home');
  };

  const handleClose = () => {
    setStep('ROLE_SELECT');
    setRole(null);
    setTempPhone('');
  };

  return (
    <div style={loginStyle}>
      {step === 'ROLE_SELECT' && (
        <RoleSelection onSelectRole={handleSelectRole} />
      )}
      
      {step === 'PHONE_OTP' && (
        <LoginForm 
            role={role} 
            onClose={handleClose} 
            onSuccess={handleLoginSuccess} 
        />
      )}
      
      {step === 'REGISTER' && (
        <RegisterForm 
            phoneNumber={tempPhone} 
            onClose={handleClose} 
            onRegister={handleRegisterSuccess} 
        />
      )}
    </div>
  );
};

export default LoginPage;