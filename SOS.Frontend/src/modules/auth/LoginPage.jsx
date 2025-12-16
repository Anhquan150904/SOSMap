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

      // Kiểm tra user cũ hay mới (Dựa vào response backend)
      // Nếu backend trả về otp.isExistingUser thì dùng, nếu không mặc định false
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

  // --- 3. XÁC THỰC & ĐĂNG NHẬP (QUAN TRỌNG) ---
  const handleVerifyAndLogin = async () => {
    if (!otp) { alert("Vui lòng nhập mã OTP"); return; }
    
    if (isNewUser && !fullName.trim()) { 
        alert("Vui lòng nhập Họ và Tên."); 
        return; 
    }

    try {
      setIsLoading(true);

      // Gọi API Verify
      const verifyRes = await axios.post(`${API_BASE}/auth/verify-otp`, {
        phone: phone,
        code: otp,
        fullName: fullName, 
      });

      // [SỬA LỖI Ở ĐÂY] 
      // API trả về trực tiếp object User: { userId: "...", fullName: "...", ... }
      // Chứ không phải { user: {...} }
      const userData = verifyRes.data; 

      console.log("✅ Đăng nhập thành công:", userData);

      // Tạo object session chuẩn để lưu (bắt buộc phải có ID)
      const currentUser = {
          ...userData,                 // Lấy hết các trường từ API (phone, fullName, status...)
          id: userData.userId,         // [QUAN TRỌNG] Map userId thành id để HomePage dùng
          role: role === 'volunteer' ? 'volunteer' : (userData.role || 'citizen') // Ưu tiên role user chọn hoặc từ DB
      };

      // Lưu vào LocalStorage
      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      // Nếu backend có trả token ở header hoặc chỗ khác thì lưu thêm, 
      // nhưng hiện tại ta tập trung vào việc lưu ID user.

      alert("Đăng nhập thành công!");
      navigate('/home');

    } catch (error) {
      console.error("Lỗi xác thực:", error);
      alert("Mã OTP không đúng hoặc có lỗi xảy ra.");
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
                <div>
                    <label>Địa chỉ (Tùy chọn):</label>
                    <input 
                    style={inputStyle} type="text" placeholder="Hà Nội..." 
                    value={address} onChange={(e) => setAddress(e.target.value)}
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