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
        private readonly GeometryFactory _geomFactory;
        public SafetyPointRepository(SosDbContext db)
        {
            _db = db;
            _geomFactory = NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);
        }

        public async Task AddAsync(SafetyPoint p, CancellationToken ct = default)
        {
            await _db.SafetyPoints.AddAsync(p, ct);
            await _db.SaveChangesAsync(ct);
        }

        public async Task<IEnumerable<SafetyPoint>> FindNearbyAsync(double lat, double lng, double radiusMeters, int limit = 50, CancellationToken ct = default)
        {
            var point = _geomFactory.CreatePoint(new Coordinate(lng, lat));
            return await _db.SafetyPoints
                .Where(s => s.Location.Distance(point) <= radiusMeters)
                .OrderBy(s => s.Location.Distance(point))
                .Take(limit)
                .ToListAsync(ct);
        }
    }
}
