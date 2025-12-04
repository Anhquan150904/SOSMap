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
    }
}
