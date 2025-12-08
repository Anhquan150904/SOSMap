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

  const handleLoginSuccess = (phoneNumber) => {
    setTempPhone(phoneNumber);
    
    // Tạo khóa tìm kiếm: SĐT + Role (Lưu ý: volunteer-pending cũng dùng chung luồng volunteer)
    // Nếu chọn volunteer thì ta sẽ check cả 2 key: volunteer và volunteer-pending
    let targetRole = role; 
    
    const userDB = JSON.parse(localStorage.getItem('USER_DATABASE') || '{}');
    
    // Check xem user đã tồn tại với role chính thức chưa
    let userKey = `${phoneNumber}_${targetRole}`;
    
    // Nếu chọn volunteer, check xem có đang pending không
    if (role === 'volunteer') {
        if (userDB[`${phoneNumber}_volunteer`]) {
            userKey = `${phoneNumber}_volunteer`;
        } else if (userDB[`${phoneNumber}_volunteer-pending`]) {
            userKey = `${phoneNumber}_volunteer-pending`;
        }
    }

    if (userDB[userKey]) {
      const existingUser = userDB[userKey];
      localStorage.setItem('currentUser', JSON.stringify(existingUser)); 
      navigate('/home');
    } else {
      setStep('REGISTER');
    }
  };

  // --- LOGIC ĐĂNG KÝ MỚI ---
  const handleRegisterSuccess = (userData) => {
    // Xác định role thực tế khi lưu
    // Nếu chọn citizen -> citizen
    // Nếu chọn volunteer -> volunteer-pending (Chờ duyệt)
    const effectiveRole = role === 'volunteer' ? 'volunteer-pending' : 'citizen';

    const newUser = { 
      name: userData.fullName, 
      phone: userData.phoneNumber,
      role: effectiveRole, // Lưu role mới
      address: userData.address,   
      location: userData.location,
      joinedAt: new Date().toLocaleString()
    };

    // 1. Lưu vào Database User
    const uniqueKey = `${userData.phoneNumber}_${effectiveRole}`;
    const userDB = JSON.parse(localStorage.getItem('USER_DATABASE') || '{}');
    userDB[uniqueKey] = newUser;
    localStorage.setItem('USER_DATABASE', JSON.stringify(userDB));

    // 2. Nếu là Volunteer, tạo thêm yêu cầu duyệt gửi Admin
    if (role === 'volunteer') {
        const approvalReqs = JSON.parse(localStorage.getItem('VOLUNTEER_APPROVALS') || '[]');
        approvalReqs.push(newUser);
        localStorage.setItem('VOLUNTEER_APPROVALS', JSON.stringify(approvalReqs));
        alert("Đăng ký thành công! Tài khoản của bạn đang chờ Admin duyệt. Hiện tại bạn có thể sử dụng chức năng như Người dân.");
    }

    // 3. Lưu phiên làm việc
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    navigate('/home');
  };

  const handleClose = () => {
    setStep('ROLE_SELECT'); setRole(null); setTempPhone('');
  };

  return (
    <div style={loginStyle}>
      {step === 'ROLE_SELECT' && <RoleSelection onSelectRole={handleSelectRole} />}
      {step === 'PHONE_OTP' && <LoginForm role={role} onClose={handleClose} onSuccess={handleLoginSuccess} />}
      {step === 'REGISTER' && <RegisterForm phoneNumber={tempPhone} onClose={handleClose} onRegister={handleRegisterSuccess} />}
    </div>
  );
};

export default LoginPage;