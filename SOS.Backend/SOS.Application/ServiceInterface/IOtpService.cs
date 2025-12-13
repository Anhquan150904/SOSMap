

namespace Sos.Service.Interfaces
{
    public interface IOtpService
    {
        public Task<string> GenerateAndStoreOtpAsync(string phone);
        public Task<bool> ValidateOtpAsync(string phone, string code);
    }
}
