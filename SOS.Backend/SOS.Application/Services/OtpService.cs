using Sos.Domain.Interfaces;
using Sos.Service.Interfaces;

namespace Sos.Application.Services
{
    public class OtpService : IOtpService
    {
        private readonly IOtpStore _otpStore;
        private readonly TimeSpan _ttl = TimeSpan.FromMinutes(5);

        public OtpService(IOtpStore otpStore)
        {
            _otpStore = otpStore;
        }

        public async Task<string> GenerateAndStoreOtpAsync(string phone)
        {
            var code = Random.Shared.Next(100000, 999999).ToString();
            await _otpStore.SaveAsync(phone, code, _ttl);

            // Application KHÔNG gửi SMS
            return code;
        }

        public async Task<bool> ValidateOtpAsync(string phone, string code)
        {
            var stored = await _otpStore.GetAsync(phone);
            if (stored == null) return false;

            if (stored == code)
            {
                await _otpStore.RemoveAsync(phone);
                return true;
            }

            return false;
        }
    }
}
