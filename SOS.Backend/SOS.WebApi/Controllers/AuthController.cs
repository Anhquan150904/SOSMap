using Microsoft.AspNetCore.Mvc;
using Sos.Application.DTOs.OtpDto;
using Sos.Service.Interfaces;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth)
    {
        _auth = auth;
    }

    [HttpPost("send-otp")]
    public async Task<IActionResult> SendOtp([FromBody] SendOtpRequest req)
    {
        var code = await _auth.SendOtpAsync(req.Phone);
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
        var result = await _auth.VerifyOtpAsync(req);
        return Ok(result);
    }

    [HttpPost("verify-otp-become-a-volunteer")]
    public async Task<IActionResult> VerifyOtpBecomeVolunteer([FromBody] VerifyOtpRequest req)
    {
        var result = await _auth.VerifyOtpBecomeVolunteerAsync(req);
        return Ok(result);
    }
}
