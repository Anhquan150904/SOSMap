// Sos.Application.Services.AuthService.cs
using Sos.Application.DTOs.OtpDto;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;
using Sos.Service.Interfaces;

public class AuthService: IAuthService
{
    private readonly IOtpService _otp;
    private readonly IUserRepository _userRepo;

    public AuthService(IOtpService otp, IUserRepository userRepo)
    {
        _otp = otp;
        _userRepo = userRepo;
    }

    public async Task<string> SendOtpAsync(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            throw new ArgumentException("Phone required");

        return await _otp.GenerateAndStoreOtpAsync(phone);
    }

    public async Task<AuthResultDto> VerifyOtpAsync(VerifyOtpRequest req)
    {
        if (!await _otp.ValidateOtpAsync(req.Phone, req.Code))
            throw new InvalidOperationException("Invalid or expired OTP");

        var user = await _userRepo.GetByPhoneAsync(req.Phone);

        if (user == null)
        {
            user = new User
            {
                Phone = req.Phone,
                FullName = req.FullName,
                Role = "citizen",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _userRepo.AddAsync(user);
        }
        else
        {
            // Nếu chuỗi KHÔNG (null hoặc rỗng)
            if (!string.IsNullOrEmpty(req.FullName))
            {
                user.FullName = req.FullName;
            }
            user.UpdatedAt = DateTime.UtcNow;
            await _userRepo.UpdateAsync(user);
        }

        return new AuthResultDto(user);
    }

    public async Task<AuthVolunteerResultDto> VerifyOtpBecomeVolunteerAsync(VerifyOtpRequest req)
    {
        if (!await _otp.ValidateOtpAsync(req.Phone, req.Code))
            throw new InvalidOperationException("Invalid or expired OTP");

        var user = await _userRepo.GetByPhoneAsync(req.Phone);

        if (user == null)
        {
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
            if (user.Role != "admin")
            {
                user.Role = "volunteer";
                user.Status = "Pending";
            }

            // Nếu chuỗi KHÔNG (null hoặc rỗng)
            if (!string.IsNullOrEmpty(req.FullName))
            {
                user.FullName = req.FullName;
            }
            user.UpdatedAt = DateTime.UtcNow;
            await _userRepo.UpdateAsync(user);
        }

        return new AuthVolunteerResultDto
        {
            UserId = user.Id,
            Phone = user.Phone,
            FullName = user.FullName,
            Role = user.Role,
            Status = user.Status,
            Message = "Bạn đã đăng ký thành công trở thành nhóm cứu hộ. Vui lòng đợi quản trị viên kiểm tra và duyệt thông tin!"
        };
    }
}
