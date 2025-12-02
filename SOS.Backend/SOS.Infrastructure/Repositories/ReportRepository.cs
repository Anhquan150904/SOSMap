using Microsoft.EntityFrameworkCore;
using NetTopologySuite;
using NetTopologySuite.Geometries;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;
using Sos.Infrastructure.Persistence;

namespace Sos.Infrastructure.Repositories
{
    public class ReportRepository : IReportRepository
    {
        private readonly SosDbContext _db;
        private readonly GeometryFactory _geomFactory;
        public ReportRepository(SosDbContext db)
        {
            _db = db;
            _geomFactory = NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);
        }

        public async Task AddAsync(SOSReport report, CancellationToken ct = default)
        {
            await _db.SOSReports.AddAsync(report, ct);
            await _db.SaveChangesAsync(ct);
        }

        public async Task<SOSReport?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            return await _db.SOSReports.FirstOrDefaultAsync(r => r.Id == id, ct);
        }

        public async Task UpdateAsync(SOSReport report, CancellationToken ct = default)
        {
            _db.SOSReports.Update(report);
            await _db.SaveChangesAsync(ct);
        }

        public async Task<IEnumerable<SOSReport>> FindNearbyAsync(double lat, double lng, double radiusMeters, int limit = 200, CancellationToken ct = default)
        {
            var point = _geomFactory.CreatePoint(new Coordinate(lng, lat));
            // SQL Server translation: use STDistance on geography
            return await _db.SOSReports
                .Where(r => r.Location.Distance(point) <= radiusMeters) // Linq -> SQL translation
                .OrderBy(r => r.Location.Distance(point))
                .Take(limit)
                .ToListAsync(ct);
        }
    }
}
