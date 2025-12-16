using Sos.Domain.Interfaces;
using Sos.Service.Interfaces;
using SOS.Application.DTOs.OtpDto;

namespace Sos.Application.Services
{
    public class OtpService : IOtpService
    {
        private readonly IOtpStore _otpStore;
        private readonly TimeSpan _ttl = TimeSpan.FromMinutes(5);
        private IUserRepository _repo;

        public OtpService(IOtpStore otpStore, IUserRepository repo)
        {
            _otpStore = otpStore;
            _repo = repo;
        }

        public async Task<OtpGenerateResult> GenerateAndStoreOtpAsync(string phone)
        {
            var code = Random.Shared.Next(100000, 999999).ToString();

            await _otpStore.SaveAsync(phone, code, _ttl);

            var user = await _repo.GetByPhoneAsync(phone);

            return new OtpGenerateResult
            {
                Code = code,
                IsExistingUser = user != null
            };
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
