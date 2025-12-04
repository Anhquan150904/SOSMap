using StackExchange.Redis;

namespace Sos.Application.Services
{
    public class OtpService
    {
        private readonly StackExchange.Redis.IDatabase _db;
        private readonly TimeSpan _ttl = TimeSpan.FromMinutes(5);

        public OtpService(IConnectionMultiplexer mux)
        {
            _db = mux.GetDatabase();
        }

        public async Task<string> GenerateAndStoreOtpAsync(string phone)
        {
            var rnd = new Random();
            var code = rnd.Next(100000, 999999).ToString();
            var key = $"otp:{phone}";
            await _db.StringSetAsync(key, code, _ttl);
            // In production: send SMS via provider
            return code;
        }

        public async Task<bool> ValidateOtpAsync(string phone, string code)
        {
            var key = $"otp:{phone}";
            var stored = await _db.StringGetAsync(key);
            if (stored.IsNullOrEmpty) return false;
            if (stored == code)
            {
                await _db.KeyDeleteAsync(key);
                return true;
            }
            return false;
        }
    }
}
