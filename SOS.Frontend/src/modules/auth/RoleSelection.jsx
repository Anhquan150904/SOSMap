import React from 'react';

const RoleSelection = ({ onSelectRole }) => {
  return (
    <div className="role-selection">
      <h1>Cổng Thông Tin Cứu Trợ</h1>
      <p>Vui lòng chọn vai trò để tiếp tục</p>
      
      <div className="role-cards">
        {/* Thêm class rescuee-card */}
        <div className="card rescuee-card" onClick={() => onSelectRole('rescuee')}>
          {/* Thêm icon/emoji cho sinh động */}
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🆘</div>
          <h3>Cần Cứu Trợ</h3>
          <p>Tôi đang gặp nạn, thiếu lương thực hoặc cần sự giúp đỡ y tế khẩn cấp.</p>
        </div>

        {/* Thêm class rescuer-card */}
        <div className="card rescuer-card" onClick={() => onSelectRole('rescuer')}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🚑</div>
          <h3>Người Cứu Trợ</h3>
          <p>Tôi có xe, thuyền, lương thực hoặc thuốc men muốn chia sẻ với cộng đồng.</p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;