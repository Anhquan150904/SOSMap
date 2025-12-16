

using SOS.Application.DTOs.OtpDto;

namespace Sos.Service.Interfaces
{
    public interface IOtpService
    {
        public Task<OtpGenerateResult> GenerateAndStoreOtpAsync(string phone);
        public Task<bool> ValidateOtpAsync(string phone, string code);
    }
}
