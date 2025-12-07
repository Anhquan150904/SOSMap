using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;
using Sos.Infrastructure.Persistence;

namespace Sos.Infrastructure.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly SosDbContext _db;
        public UserRepository(SosDbContext db) { _db = db; }

        public async Task AddAsync(User user, CancellationToken ct = default)
        {
            await _db.Users.AddAsync(user, ct);
            await _db.SaveChangesAsync(ct);
        }

        public async Task<User?> GetByPhoneAsync(string phone, CancellationToken ct = default)
        {
            return await _db.Users.FirstOrDefaultAsync(u => u.Phone == phone, ct);
        }

        public async Task UpdateAsync(User user, CancellationToken ct = default)
        {
            _db.Users.Update(user);
            await _db.SaveChangesAsync(ct);
        }

        public async Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            return await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        }

        // Lấy Vị trí của người dùng theo Id
        public async Task<string?> GetAdressByIdAsync(Guid id, CancellationToken ct = default)
        {
            var user = await _db.Users.AsNoTracking()
                .Where(u => u.Id == id)
                .Select(u => u.Address)
                .FirstOrDefaultAsync(ct);
            return user;
        }

        // Cập nhật vị trí của người dùng
        public async Task UpdateLocationAsync(Guid id, string address, CancellationToken ct = default)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
            if (user != null)
            {
                user.Address = address;
                user.UpdatedAt = DateTime.UtcNow;
                _db.Users.Update(user);
                await _db.SaveChangesAsync(ct);
            }
        }
        // Lấy danh sách người dùng theo role truyền vào
        public async Task<List<User>> GetUsersByRoleAsync(string role, CancellationToken ct = default)
        {
            return await _db.Users
                .Where(u => u.Role == role)
                .ToListAsync(ct);
        }
        // Lấy danh sách người dùng theo status truyền vào
        public async Task<List<User>> GetUserByStatusAsync(string status, CancellationToken ct = default)
        {
            return await _db.Users
                .Where(u => u.Status == status)
                .ToListAsync(ct);
        }

    }
}
