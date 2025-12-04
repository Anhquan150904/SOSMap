import React from 'react';
// KHÔNG cần import useNavigate nữa

const RoleSelection = ({ onSelectRole }) => {
  
  const handleRoleClick = (selectedRole) => {
    // Chỉ gọi hàm này để báo cho LoginPage biết
    // LoginPage sẽ tự động chuyển sang bước nhập SĐT
    if (onSelectRole) {
      onSelectRole(selectedRole);
    }
  };

  return (
    <div className="role-selection">
      <h1>Cổng Thông Tin Cứu Trợ</h1>
      <p>Vui lòng chọn vai trò để tiếp tục</p>
      
      <div className="role-cards">
        {/* Card Rescuee */}
        <div 
          className="card rescuee-card" 
          onClick={() => handleRoleClick('rescuee')} 
          style={{ cursor: 'pointer' }} 
        >
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🆘</div>
          <h3>Cần Cứu Trợ</h3>
          <p>Tôi đang gặp nạn, thiếu lương thực hoặc cần sự giúp đỡ y tế khẩn cấp.</p>
        </div>

        {/* Card Rescuer */}
        <div 
          className="card rescuer-card" 
          onClick={() => handleRoleClick('rescuer')} 
          style={{ cursor: 'pointer' }}
        >
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🚑</div>
          <h3>Người Cứu Trợ</h3>
          <p>Tôi có xe, thuyền, lương thực hoặc thuốc men muốn chia sẻ với cộng đồng.</p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;