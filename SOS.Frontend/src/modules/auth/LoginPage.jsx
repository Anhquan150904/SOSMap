// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import RoleSelection from './RoleSelection';

const API_BASE = "http://localhost:5075/api"; 

const LoginPage = () => {
  const navigate = useNavigate();
  
  // --- STATE QUẢN LÝ ---
  const [step, setStep] = useState('ROLE_SELECT');
  const [role, setRole] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);

  // --- STATE DỮ LIỆU ---
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');

  // --- STATE KIỂM TRA USER CŨ/MỚI ---
  const [isNewUser, setIsNewUser] = useState(false);

  // Style
  const containerStyle = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: 'linear-gradient(135deg, #e0e7ff 0%, #f3f4f6 100%)', padding: '20px'
  };
  const cardStyle = {
    background: 'white', padding: '30px', borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px'
  };
  const inputStyle = {
    width: '100%', padding: '12px', margin: '10px 0',
    border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px'
  };
  const btnStyle = {
    width: '100%', padding: '12px', background: '#2563eb', color: 'white',
    border: 'none', borderRadius: '6px', fontSize: '16px', cursor: 'pointer',
    fontWeight: 'bold', marginTop: '10px'
  };

  const handleSelectRole = (selectedRole) => {
    setRole(selectedRole);
    setStep('INPUT_PHONE');
  };

  // --- 2. GỬI OTP ---
  const handleSendOtp = async () => {
    if (!phone || phone.length < 9) {
      alert("Vui lòng nhập số điện thoại hợp lệ");
      return;
    }

    try {
      setIsLoading(true);
      console.log("🚀 Đang gửi OTP:", phone);

      // Gọi API gửi OTP
      const res = await axios.post(
          `${API_BASE}/auth/send-otp`, 
          { phone: phone }, 
          { headers: { 'Content-Type': 'application/json' } }
      );
      
      console.log("📦 Kết quả Send OTP:", res.data);

      // Kiểm tra user cũ hay mới
      const isExisting = res.data.otp?.isExistingUser === true;

      if (isExisting) {
          setIsNewUser(false); // User cũ -> Chỉ cần nhập OTP
      } else {
          setIsNewUser(true);  // User mới -> Cần nhập thêm Tên
      }
      
      alert(`Đã gửi mã OTP đến ${phone}`);
      setStep('INPUT_OTP_DATA'); 

    } catch (error) {
      console.error("Lỗi gửi OTP:", error);
      alert("Lỗi gửi OTP. Vui lòng kiểm tra lại số điện thoại.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. XÁC THỰC & ĐĂNG NHẬP (CÓ CHIA API THEO ROLE) ---
  const handleVerifyAndLogin = async () => {
    if (!otp) { alert("Vui lòng nhập mã OTP"); return; }
    
    if (isNewUser && !fullName.trim()) { 
        alert("Vui lòng nhập Họ và Tên."); 
        return; 
    }

    try {
      setIsLoading(true);

      // 1. Xác định Role mục tiêu (nếu chưa chọn gì thì mặc định là citizen)
      const targetRole = role || 'citizen';

      // 2. Chọn API dựa trên Role
      let apiEndpoint = `${API_BASE}/auth/verify-otp`; 
      if (targetRole === 'volunteer') {
          apiEndpoint = `${API_BASE}/auth/verify-otp-become-a-volunteer`;
      }

      console.log(`🚀 Đang gọi API: ${apiEndpoint} (Target Role: ${targetRole})`);

      // 3. Gọi API Verify (GỬI THÊM FIELD ROLE)
      // Việc gửi thêm 'role' giúp Backend phân biệt được user nào nếu SĐT bị trùng
      const verifyRes = await axios.post(apiEndpoint, {
        phone: phone,
        code: otp,
        fullName: fullName, 
        role: targetRole // <--- QUAN TRỌNG: Gửi role lên để backend lọc
      });

      // 4. Lấy dữ liệu user trả về
      let userData = verifyRes.data.user || verifyRes.data; 
      console.log("✅ Dữ liệu từ Backend:", userData);

      // 5. Xử lý Logic hiển thị Role (Pending vs Active)
      let finalRole = userData.role; // Lấy role gốc từ DB (citizen hoặc volunteer)

      // Nếu đang đăng nhập luồng Volunteer
      if (targetRole === 'volunteer') {
          // Nếu status là 'Pending' -> Ép kiểu về 'volunteer-pending' để UI hiện thông báo chờ
          if (userData.status === 'Pending') {
              finalRole = 'volunteer-pending';
          }
      }

      // 6. Tạo object User chuẩn để lưu
      const currentUser = {
          ...userData,
          id: userData.userId || userData.id, // Đảm bảo luôn có ID
          role: finalRole // Role đã qua xử lý logic
      };

      // 7. Lưu vào LocalStorage
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      if (verifyRes.data.token) {
          localStorage.setItem('accessToken', verifyRes.data.token);
      }

      // Thông báo chi tiết hơn chút
      const msg = finalRole === 'volunteer-pending' 
          ? "Đăng ký thành công! Vui lòng chờ Admin duyệt." 
          : "Đăng nhập thành công!";
          
      alert(msg);
      navigate('/home');

    } catch (error) {
      console.error("Lỗi xác thực:", error);
      alert("Mã OTP không đúng hoặc có lỗi xảy ra phía Server.");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div style={containerStyle}>
      {step === 'ROLE_SELECT' && <RoleSelection onSelectRole={handleSelectRole} />}

      {step === 'INPUT_PHONE' && (
        <div style={cardStyle}>
          <h2 style={{textAlign: 'center', marginBottom: '20px'}}>Đăng Nhập</h2>
          <label>Số điện thoại:</label>
          <input 
            style={inputStyle} type="text" placeholder="09xxxxxx" 
            value={phone} onChange={(e) => setPhone(e.target.value)}
          />
          <button style={btnStyle} onClick={handleSendOtp} disabled={isLoading}>
            {isLoading ? "Đang gửi..." : "Tiếp tục"}
          </button>
          <button 
            style={{...btnStyle, background: 'transparent', color: '#555', marginTop: '5px'}} 
            onClick={() => setStep('ROLE_SELECT')}
          >
            Quay lại
          </button>
        </div>
      )}

      {step === 'INPUT_OTP_DATA' && (
        <div style={cardStyle}>
          <h2 style={{textAlign: 'center', marginBottom: '20px'}}>Xác thực</h2>
          
          <div style={{marginBottom: '15px'}}>
            <label style={{fontWeight: 'bold'}}>Mã OTP:</label>
            <input 
              style={{...inputStyle, textAlign: 'center', letterSpacing: '5px', fontWeight: 'bold'}} 
              type="text" placeholder="6 số" 
              value={otp} onChange={(e) => setOtp(e.target.value)}
            />
          </div>

          {/* Form nhập tên chỉ hiện khi là User Mới */}
          {isNewUser ? (
              <>
                <hr style={{border: '0', borderTop: '1px solid #eee', margin: '20px 0'}} />
                <p style={{fontSize: '0.9rem', color: '#059669', marginBottom: '10px', fontWeight: 'bold'}}>
                  👋 Chào bạn mới! Vui lòng điền thông tin:
                </p>
                <div>
                    <label>Họ và Tên <span style={{color:'red'}}>*</span>:</label>
                    <input 
                    style={inputStyle} type="text" placeholder="Nguyễn Văn A" 
                    value={fullName} onChange={(e) => setFullName(e.target.value)}
                    />
                </div>
              </>
          ) : (
               <div style={{textAlign: 'center', marginTop: '20px', padding: '10px', background: '#f0f9ff', borderRadius: '8px', color: '#0369a1'}}>
                 <p style={{margin: 0, fontWeight: '500'}}>Chào mừng bạn quay trở lại!</p>
               </div>
          )}

          <button style={{...btnStyle, background: '#10b981'}} onClick={handleVerifyAndLogin} disabled={isLoading}>
            {isLoading ? "Đang xử lý..." : "Xác nhận & Vào ứng dụng"}
          </button>
        </div>
      )}
    </div>
  );
};

export default LoginPage;