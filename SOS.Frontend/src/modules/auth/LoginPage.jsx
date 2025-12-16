import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import RoleSelection from './RoleSelection';

// Cấu hình URL API (kiểm tra lại port của bạn 5075 hay 7045)
const API_BASE = "http://localhost:5075/api"; 

const LoginPage = () => {
  const navigate = useNavigate();
  
  // --- STATE QUẢN LÝ MÀN HÌNH ---
  const [step, setStep] = useState('ROLE_SELECT'); // ROLE_SELECT | INPUT_PHONE | INPUT_OTP_DATA
  const [role, setRole] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);

  // --- STATE DỮ LIỆU ---
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');

  // Style cơ bản
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

  // --- 1. CHỌN VAI TRÒ ---
  const handleSelectRole = (selectedRole) => {
    setRole(selectedRole);
    setStep('INPUT_PHONE');
  };

  // --- 2. GỬI OTP (Gọi API SendOtpAsync) ---
  const handleSendOtp = async () => {
    if (!phone || phone.length < 9) {
      alert("Vui lòng nhập số điện thoại hợp lệ");
      return;
    }

    try {
      setIsLoading(true);
      
      console.log("🚀 Đang gửi OTP cho:", phone);

      // --- [SỬA Ở ĐÂY] ---
      // CŨ (Gây lỗi 400): JSON.stringify(phone) -> Gửi string thô
      // MỚI (Chuẩn DTO): { phone: phone } -> Gửi Object JSON
      await axios.post(
          `${API_BASE}/auth/send-otp`, 
          { phone: phone }, // <--- Thay đổi dòng này
          {
             headers: { 'Content-Type': 'application/json' }
          }
      );
      
      alert(`Đã gửi mã OTP đến ${phone}`);
      setStep('INPUT_OTP_DATA'); 

    } catch (error) {
      console.error("Lỗi gửi OTP:", error);
      // Hiển thị lỗi chi tiết từ Backend nếu có
      const errorMsg = error.response?.data?.title || "Không thể gửi OTP. Vui lòng thử lại.";
      alert(`Lỗi: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. XÁC THỰC & ĐĂNG KÝ (Gọi API VerifyOtpAsync + Address) ---
  const handleVerifyAndLogin = async () => {
    if (!otp) { alert("Vui lòng nhập mã OTP"); return; }
    // Nếu là citizen (người dân), bắt buộc nhập tên ngay lần đầu
    // Nếu backend cho phép tên rỗng thì có thể bỏ check này
    try {
      setIsLoading(true);

      console.log("🚀 Đang gọi VerifyOtpAsync...");
      
      // A. GỌI API VERIFY (Backend sẽ tạo User + Lưu FullName tại đây)
      const verifyRes = await axios.post(`${API_BASE}/auth/verify-otp`, {
        phone: phone,
        code: otp,
        fullName: fullName, // <-- QUAN TRỌNG: Gửi tên ngay lúc này
        // Role thường backend tự set default là citizen, hoặc bạn cần API hỗ trợ role
      });

      // Lấy Token và User từ phản hồi
      const { token, user } = verifyRes.data; 
      // Lưu ý: user trả về từ C# có thể chưa có Address nếu verifyOtp ko xử lý address

      if (token) {
        localStorage.setItem('accessToken', token);
      }

      // C. LƯU SESSION VÀ CHUYỂN TRANG
      // Lưu thông tin user vào localStorage để hiển thị trên Header (KHÔNG PHẢI LÀM DATABASE)
      const currentUser = {
          ...user,
          role: role === 'volunteer' ? 'volunteer' : 'citizen' // Set tạm role hiển thị
      };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      alert("Đăng nhập thành công!");
      navigate('/home');

    } catch (error) {
      console.error("Lỗi xác thực:", error);
      const msg = error.response?.data?.message || "Mã OTP không đúng hoặc hết hạn";
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDER GIAO DIỆN ---
  return (
    <div style={containerStyle}>
      
      {/* MÀN 1: CHỌN ROLE */}
      {step === 'ROLE_SELECT' && (
        <RoleSelection onSelectRole={handleSelectRole} />
      )}

      {/* MÀN 2: NHẬP SỐ ĐIỆN THOẠI */}
      {step === 'INPUT_PHONE' && (
        <div style={cardStyle}>
          <h2 style={{textAlign: 'center', marginBottom: '20px'}}>Đăng Nhập / Đăng Ký</h2>
          <label>Số điện thoại của bạn:</label>
          <input 
            style={inputStyle} 
            type="text" 
            placeholder="0912345678" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button style={btnStyle} onClick={handleSendOtp} disabled={isLoading}>
            {isLoading ? "Đang gửi..." : "Gửi mã OTP"}
          </button>
          <button 
            style={{...btnStyle, background: 'transparent', color: '#555', marginTop: '5px'}} 
            onClick={() => setStep('ROLE_SELECT')}
          >
            Quay lại
          </button>
        </div>
      )}

      {/* MÀN 3: NHẬP OTP + THÔNG TIN (GỘP) */}
      {step === 'INPUT_OTP_DATA' && (
        <div style={cardStyle}>
          <h2 style={{textAlign: 'center', marginBottom: '20px'}}>Xác thực thông tin</h2>
          
          <div style={{marginBottom: '15px'}}>
            <label style={{fontWeight: 'bold'}}>Mã OTP (Đã gửi về {phone})</label>
            <input 
              style={{...inputStyle, textAlign: 'center', letterSpacing: '5px', fontWeight: 'bold'}} 
              type="text" 
              placeholder="Nhập mã 6 số" 
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>

          <hr style={{border: '0', borderTop: '1px solid #eee', margin: '20px 0'}} />
          
          <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '10px'}}>
            Vui lòng nhập thông tin để chúng tôi xác nhận danh tính:
          </p>

          <div>
            <label>Họ và Tên:</label>
            <input 
              style={inputStyle} 
              type="text" 
              placeholder="Nguyễn Văn A" 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <button style={{...btnStyle, background: '#10b981'}} onClick={handleVerifyAndLogin} disabled={isLoading}>
            {isLoading ? "Đang xử lý..." : "Xác nhận & Vào ứng dụng"}
          </button>
        </div>
      )}

    </div>
  );
};

export default LoginPage;