using Sos.Application.DTOs.OtpDto;

namespace Sos.Service.Interfaces
{
    public interface IAuthService
    {
        Task<string> SendOtpAsync(string phone);

        Task<AuthResultDto> VerifyOtpAsync(VerifyOtpRequest req);

        Task<AuthVolunteerResultDto> VerifyOtpBecomeVolunteerAsync(VerifyOtpRequest req);
    }
}
