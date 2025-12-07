using Microsoft.EntityFrameworkCore;
using NetTopologySuite;
using NetTopologySuite.Geometries;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;
using Sos.Infrastructure.Persistence;

namespace Sos.Infrastructure.Repositories
{
    public class SafetyPointRepository : ISafetyPointRepository
    {
        private readonly SosDbContext _db;
        public SafetyPointRepository(SosDbContext db)
        {
            _db = db;
        }

        public async Task AddAsync(SafetyPoint p, CancellationToken ct = default)
        {
            await _db.SafetyPoints.AddAsync(p, ct);
            await _db.SaveChangesAsync(ct);
        }

        public async Task<IEnumerable<SafetyPoint>> FindNearbyAsync(string province,int limit = 50, CancellationToken ct = default)
        {
            return await _db.SafetyPoints
                .Where(s => s.Address != null &&
                            EF.Functions.Like(
                                s.Address.ToLower(),
                                "%" + province.ToLower() + "%" // Lấy các bản ghi có chứa tên tỉnh/thành phố
                            ))
                .OrderBy(s => s.CreatedAt)
                .Take(limit)
                .ToListAsync(ct);
        }
    }
}
