import React, { useState } from 'react';
import Modal from '../../components/Modal';

const RegisterForm = ({ phoneNumber, onClose, onRegister }) => {
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  // Đã xóa state DOB
  const [isChecking, setIsChecking] = useState(false); 

  const handleSubmit = async () => {
    // 1. Kiểm tra rỗng (Chỉ còn Tên và Địa chỉ)
    if (!fullName || !address) {
      alert("Vui lòng điền đầy đủ: Họ tên và Địa chỉ!");
      return;
    }
    
    setIsChecking(true);

    try {
      // 2. Gọi API kiểm tra địa chỉ
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        // --- TÌM THẤY ĐỊA CHỈ ---
        const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        console.log("Tìm thấy tọa độ:", coords);

        onRegister({ 
          fullName, 
          // Đã xóa dob ở đây
          phoneNumber, 
          address: data[0].display_name, 
          location: coords 
        });

      } else {
        // --- KHÔNG TÌM THẤY ---
        alert("❌ Không tìm thấy địa chỉ này trên bản đồ!\n\nGợi ý: Hãy nhập chi tiết hơn (Số nhà, Đường, Quận/Huyện, Tỉnh/Thành).");
      }

    } catch (error) {
      console.error("Lỗi mạng:", error);
      alert("Lỗi kết nối bản đồ. Vui lòng thử lại.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Modal title="Hoàn tất đăng ký" onClose={onClose}>
      <p>Số điện thoại chưa tồn tại. Vui lòng điền thông tin.</p>

      <div className="form-group">
        <label>Số điện thoại</label>
        <input type="text" value={phoneNumber} readOnly style={{background: '#f3f4f6', color: '#888'}} />
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

      <div className="form-group">
        <label>Địa chỉ chính xác <span style={{color: 'red'}}>*</span></label>
        <input 
          type="text" 
          placeholder="VD: 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội" 
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ border: '1px solid #007bff' }} 
        />
        <small style={{color: '#d9534f', fontSize: '0.85rem', marginTop: '5px', display: 'block'}}>
           ⚠️ Hệ thống sẽ dùng địa chỉ này để định vị bạn trên bản đồ.
        </small>
      </div>

      {/* Đã xóa ô nhập Ngày sinh ở đây */}

      <button className="btn-primary" onClick={handleSubmit} disabled={isChecking}>
        {isChecking ? 'Đang kiểm tra vị trí...' : 'Xác thực & Đăng ký'}
      </button>
    </Modal>
  );
};

export default RegisterForm;