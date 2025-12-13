namespace Sos.Domain.Interfaces
{
    public interface IOtpStore
    {
        Task SaveAsync(string phone, string code, TimeSpan ttl);
        Task<string?> GetAsync(string phone);
        Task RemoveAsync(string phone);
    }
}
