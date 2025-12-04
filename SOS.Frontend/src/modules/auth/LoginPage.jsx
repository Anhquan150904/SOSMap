import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RoleSelection from './RoleSelection';
import LoginForm from './LoginForm'; // Giả sử bạn đã tách component này
import RegisterForm from './RegisterForm'; // Giả sử bạn đã tách component này

const LoginPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('ROLE_SELECT');
  const [role, setRole] = useState(null); // Role được chọn ở bước 1
  const [tempPhone, setTempPhone] = useState('');

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

  // 1. XỬ LÝ ĐĂNG NHẬP (OTP THÀNH CÔNG)
  const handleLoginSuccess = (phoneNumber) => {
    setTempPhone(phoneNumber);
    
    // Lấy danh sách user giả lập
    const userDB = JSON.parse(localStorage.getItem('USER_DATABASE') || '{}');
    
    // Nếu sđt này đã tồn tại
    if (userDB[phoneNumber]) {
      const oldUserData = userDB[phoneNumber];

      // --- SỬA LỖI QUAN TRỌNG TẠI ĐÂY ---
      // Lấy thông tin cũ (tên, sđt) NHƯNG ghi đè bằng Role mới vừa chọn
      const sessionUser = {
        ...oldUserData,
        role: role // <--- BẮT BUỘC dùng role từ state (bước 1)
      };

      // Cập nhật ngược lại vào DB (để lần sau nhớ role này)
      userDB[phoneNumber] = sessionUser;
      localStorage.setItem('USER_DATABASE', JSON.stringify(userDB));

      // Lưu vào phiên làm việc (Dùng key 'user' để HomePage đọc được)
      localStorage.setItem('user', JSON.stringify(sessionUser)); 
      
      navigate('/home');
    } else {
      // Nếu chưa có -> Chuyển sang form Đăng Ký
      setStep('REGISTER');
    }
  };

  // 2. XỬ LÝ ĐĂNG KÝ (HỌ TÊN)
  const handleRegisterSuccess = (userData) => {
    // userData: { fullName, phoneNumber, ... }
    
    const newUser = { 
      name: userData.fullName, 
      phone: userData.phoneNumber,
      role: role // Dùng role đã chọn ở bước 1
    };

    // Lưu vào "Database" giả lập
    const userDB = JSON.parse(localStorage.getItem('USER_DATABASE') || '{}');
    userDB[userData.phoneNumber] = newUser;
    localStorage.setItem('USER_DATABASE', JSON.stringify(userDB));

    // Lưu vào phiên làm việc hiện tại (Key 'user')
    localStorage.setItem('user', JSON.stringify(newUser));
    
    navigate('/home');
  };

  const handleClose = () => {
    setStep('ROLE_SELECT');
    setRole(null);
  };

  return (
    <div style={loginStyle}>
      {/* Bước 1: Chọn Role */}
      {step === 'ROLE_SELECT' && (
        <RoleSelection onSelectRole={handleSelectRole} />
      )}
      
      {/* Bước 2: Nhập SĐT & OTP */}
      {step === 'PHONE_OTP' && (
        <LoginForm 
            role={role} // Truyền role xuống để hiển thị nếu cần
            onClose={handleClose} 
            onSuccess={handleLoginSuccess} 
        />
      )}
      
      {/* Bước 3: Đăng ký nếu là user mới */}
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