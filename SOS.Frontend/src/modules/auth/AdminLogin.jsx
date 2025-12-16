// src/modules/auth/AdminLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const navigate = useNavigate();
  // State để điều khiển việc hiển thị form nhập OTP
  // Vì là Admin, ta cho hiện form nhập SĐT luôn (bỏ qua bước chọn Role)
  const [showForm, setShowForm] = useState(true);

  const handleLoginSuccess = (phoneNumber) => {
    // --- LỚP BẢO MẬT: Kiểm tra số điện thoại Admin ---
    if (phoneNumber !== '0987654321') { // Giả sử số điện thoại Admin là 0987654321
      alert("⛔ Truy cập bị từ chối! Số điện thoại này không có quyền Admin.");
      return;
    }

    // Nếu đúng sđt Admin -> Lưu thông tin và chuyển hướng
    const adminUser = { 
      name: "Admin", 
      phone: phoneNumber, 
      role: 'admin' 
    };
    
    localStorage.setItem('user', JSON.stringify(adminUser));
    
    // Chuyển hướng đến trang Dashboard (chúng ta sẽ làm trang này sau)
    // Tạm thời mình cho về Home để test trước nhé
    navigate('/admin-dashboard');
    alert("Xin chào Admin! 👋");
  };

  const handleClose = () => {
    // Nếu bấm đóng thì quay về trang chủ khách
    navigate('/'); 
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#2c3e50', // Màu nền tối cho ngầu
    }}>
      {/* Tái sử dụng LoginForm nhưng truyền role là 'admin' */}
      {showForm && (
        <LoginForm 
          role="admin" 
          onClose={handleClose} 
          onSuccess={handleLoginSuccess} 
        />
      )}
    </div>
  );
};

export default AdminLogin;