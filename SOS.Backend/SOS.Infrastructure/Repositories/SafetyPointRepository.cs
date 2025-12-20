using Microsoft.EntityFrameworkCore;
using NetTopologySuite;
using NetTopologySuite.Geometries;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;
using Sos.Infrastructure.Persistence;
using System.Collections.Generic;

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
        public async Task UpdateAsync(CancellationToken ct = default)
        {
            await _db.SaveChangesAsync(ct);
        }

        public async Task DeletedAsync(Guid id, CancellationToken ct = default)
        {
            var entity = await _db.SafetyPoints.FirstOrDefaultAsync(r => r.Id == id, ct);
            if (entity != null)
            {
                _db.SafetyPoints.Remove(entity);
                await _db.SaveChangesAsync(ct);
            }
        }

        public async Task<SafetyPoint> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            var entity = await _db.SafetyPoints.FirstOrDefaultAsync(r => r.Id == id, ct);
            if (entity == null)
            {
                throw new InvalidOperationException($"SafetyPoint with ID {id} not found.");
            }
            return entity;
        }

        public async Task<List<SafetyPoint?>> GetSafetyByStatus(string status, CancellationToken ct = default)
        {
            return await _db.SafetyPoints
            .Where(s => s.Status != null &&
                EF.Functions.Like(
                    s.Status.ToLower(),
                    "%" + status.ToLower() + "%"
                ))
                .OrderBy(s => s.CreatedAt)
                .ToListAsync(ct);
        }
    }
}
