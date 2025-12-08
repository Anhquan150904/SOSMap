import React from 'react';

const RoleSelection = ({ onSelectRole }) => {
  return (
    <div className="role-selection">
      <h1>Cổng Thông Tin Cứu Trợ</h1>
      <p>Vui lòng chọn vai trò để tiếp tục</p>
      
      <div className="role-cards">
        {/* Card 1: Người dân (Citizen) */}
        <div className="card rescuee-card" onClick={() => onSelectRole('citizen')}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🆘</div>
          <h3>Người Dân</h3>
          <p>Tôi cần sự hỗ trợ y tế, lương thực hoặc khẩn cấp.</p>
        </div>

        {/* Card 2: Tình nguyện viên (Volunteer) */}
        <div className="card rescuer-card" onClick={() => onSelectRole('volunteer')}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>❤️</div>
          <h3>Tình Nguyện Viên</h3>
          <p>Tôi muốn tham gia đội cứu hộ (Cần Admin xét duyệt).</p>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;