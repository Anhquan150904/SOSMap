using Sos.Application.DTOs.OtpDto;
using SOS.Application.DTOs.OtpDto;

namespace Sos.Service.Interfaces
{
    public interface IAuthService
    {
        Task<OtpGenerateResult> SendOtpAsync(string phone);

        Task<AuthResultDto> VerifyOtpAsync(VerifyOtpRequest req);

        Task<AuthVolunteerResultDto> VerifyOtpBecomeVolunteerAsync(VerifyOtpRequest req);
    }
}
