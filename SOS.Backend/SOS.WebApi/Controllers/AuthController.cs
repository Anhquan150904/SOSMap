using Microsoft.AspNetCore.Mvc;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;
using Sos.Application.Services;
using NetTopologySuite.Geometries;

namespace Sos.WebApi.Controllers
{
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

            // SRID 4326 = GPS lat/lng
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

            // Tạo point (lng trước, lat sau!)
            var locationPoint = _geometryFactory.CreatePoint(new Coordinate(req.Lng, req.Lat));

            if (user == null)
            {
                user = new User
                {
                    Phone = req.Phone,
                    Role = "citizen",
                    LastKnownLocation = locationPoint,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _userRepo.AddAsync(user);
            }
            else
            {
                // update location nếu user cũ
                user.LastKnownLocation = locationPoint;
                user.UpdatedAt = DateTime.UtcNow;

                await _userRepo.UpdateAsync(user);
            }

            return Ok(new
            {
                userId = user.Id,
                phone = user.Phone,
                role = user.Role,
                lat = req.Lat,
                lng = req.Lng
            });
        }
    }

    public record SendOtpRequest(string Phone);
    public record VerifyOtpRequest(string Phone, string Code, double Lat, double Lng);
}
