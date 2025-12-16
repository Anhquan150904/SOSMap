// src/services/authService.js
import axios from 'axios';

// Cấu hình đường dẫn gốc của Backend (xem trong launchSettings.json của .NET)
const API_URL = 'http://localhost:5075/api'; 

export const authApi = {
  // API 1: Gửi yêu cầu lấy OTP
  sendOtp: async (phoneNumber) => {
    // Gọi vào AuthController của backend
    return axios.post(`${API_URL}/auth/send-otp`, { 
      Phone: phoneNumber 
    });
  },

  // API 2: Xác thực OTP và Đăng nhập
  verifyOtp: async (phoneNumber, otp, role) => {
    return axios.post(`${API_URL}/auth/verify-otp`, { 
      Phone: phoneNumber, 
      Code: otp,
      Role: role // Gửi kèm role để Backend biết là Người cứu trợ hay Người cần cứu
    });
  }
};