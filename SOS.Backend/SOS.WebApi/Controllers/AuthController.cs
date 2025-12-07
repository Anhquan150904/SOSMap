using Microsoft.AspNetCore.Mvc;
using NetTopologySuite.Geometries;
using Sos.Application.Services;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;
using Sos.Application.DTOs.OtpDto;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly OtpService _otp;
    private readonly IUserRepository _userRepo;
    private readonly GeometryFactory _geometryFactory;

    public AuthController(OtpService otp, IUserRepository userRepo)
    {
        _otp = otp;
        _userRepo = userRepo;
        _geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
    }

    [HttpPost("send-otp")]
    public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Phone)) return BadRequest("Phone required");
        var code = await _otp.GenerateAndStoreOtpAsync(req.Phone);

        return Ok(new
        {
            phone = req.Phone,
            otp = code,
            message = "OTP created (dev only)"
        });
    }

    [HttpPost("verify-otp")]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest req)
    {
        if (!await _otp.ValidateOtpAsync(req.Phone, req.Code))
            return BadRequest("Invalid or expired OTP");

        var user = await _userRepo.GetByPhoneAsync(req.Phone);
        string userRole;

        if (user == null)
        {
            // Người dùng mới (đăng ký/đăng nhập thường)
            userRole = "citizen";
            user = new User
            {
                Phone = req.Phone,
                FullName = req.FullName,
                Role = userRole,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _userRepo.AddAsync(user);
        }
        else
        {
            // Người dùng cũ (chỉ đăng nhập)
            user.UpdatedAt = DateTime.UtcNow;
            user.FullName = req.FullName ?? user.FullName; // Cập nhật FullName nếu có
            userRole = user.Role; // Giữ Role đã có (citizen/volunteer/admin)
            await _userRepo.UpdateAsync(user);
        }

        return Ok(new
        {
            userId = user.Id,
            phone = user.Phone,
            role = userRole
        });
    }

    [HttpPost("verify-otp-become-a-volunteer")]
    public async Task<IActionResult> VerifyOtpBecomeaVolunteer([FromBody] VerifyOtpRequest req)
    {
        if (!await _otp.ValidateOtpAsync(req.Phone, req.Code))
            return BadRequest("Invalid or expired OTP");

        var user = await _userRepo.GetByPhoneAsync(req.Phone);

        if (user == null)
        {
            // Người dùng mới -> Đăng ký làm Volunteer
            user = new User
            {
                Phone = req.Phone,
                FullName = req.FullName,
                Role = "volunteer",
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _userRepo.AddAsync(user);
        }
        else
        {
            // Người dùng cũ -> Nâng cấp Role thành Volunteer (chờ duyệt)
            // Cần kiểm tra xem họ có đang ở Role Admin hay không để tránh ghi đè
            if (user.Role != "admin")
            {
                user.Role = "volunteer";
                user.Status = "Pending"; // Đặt trạng thái chờ duyệt
            }
            user.UpdatedAt = DateTime.UtcNow;
            user.FullName = req.FullName ?? user.FullName;
            await _userRepo.UpdateAsync(user);
        }

        return Ok(new
        {
            userId = user.Id,
            phone = user.Phone,
            fullName = user.FullName,
            role = user.Role,
            status = user.Status,
            message = "Bạn đã đăng ký thành công trở thành nhóm cứu hộ. Vui lòng đợi quản trị viên kiểm tra và duyệt thông tin!"
        });
    }
}
