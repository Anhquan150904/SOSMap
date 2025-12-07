using Sos.Domain.Entities;

namespace Sos.Domain.Interfaces
{
    // Repository người dùng
    public interface IUserRepository
    {
        Task<User?> GetByPhoneAsync(string phone, CancellationToken ct = default);
        Task AddAsync(User user, CancellationToken ct = default);
        Task UpdateAsync(User user, CancellationToken ct = default);
        Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);

        // Lấy Vị trí của người dùng theo Id 
        Task<string?> GetAdressByIdAsync(Guid id, CancellationToken ct = default);

        // Cập nhật vị trí của người dùng
        Task UpdateLocationAsync(Guid id,  string address, CancellationToken ct = default);
        // Lấy danh sách người dùng theo role
        Task<List<User>> GetUsersByRoleAsync(string role, CancellationToken ct = default);
        // Lấy danh sách người dùng theo trạng thái
        Task<List<User>> GetUserByStatusAsync(string status, CancellationToken ct = default);
    }
}
