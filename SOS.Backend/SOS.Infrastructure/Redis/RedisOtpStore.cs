using StackExchange.Redis;
using Sos.Domain.Interfaces;

namespace Sos.Infrastructure.Redis
{
    public class RedisOtpStore : IOtpStore
    {
        private readonly IDatabase _db;

        public RedisOtpStore(IConnectionMultiplexer mux)
        {
            _db = mux.GetDatabase();
        }

        public async Task SaveAsync(string phone, string code, TimeSpan ttl)
        {
            var key = $"otp:{phone}";
            await _db.StringSetAsync(key, code, ttl);
        }

        public async Task<string?> GetAsync(string phone)
        {
            var value = await _db.StringGetAsync($"otp:{phone}");
            return value.IsNullOrEmpty ? null : value.ToString();
        }

        public async Task RemoveAsync(string phone)
        {
            await _db.KeyDeleteAsync($"otp:{phone}");
        }
    }
}
