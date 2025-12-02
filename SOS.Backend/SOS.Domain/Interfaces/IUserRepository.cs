using Sos.Domain.Entities;
using SOS.Domain.Entities;

namespace Sos.Domain.Interfaces
{
    // Repository người dùng
    public interface IUserRepository
    {
        Task<User?> GetByPhoneAsync(string phone, CancellationToken ct = default);
        Task AddAsync(User user, CancellationToken ct = default);
        Task UpdateAsync(User user, CancellationToken ct = default);
        Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);
    }
}
