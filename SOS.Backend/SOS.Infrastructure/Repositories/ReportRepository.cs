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

        public async Task<IEnumerable<SOSReport>> FindNearbyAsync(string province, int limit = 200, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(province))
                return Enumerable.Empty<SOSReport>();

            province = province.Trim();

            return await _db.SOSReports
                .AsNoTracking()
                .Where(r => r.Address != null &&
                            EF.Functions.Like(
                                r.Address.ToLower(),
                                "%" + province.ToLower() + "%" // Lấy các bản ghi có chứa tên tỉnh/thành phố
                            ))
                .Take(limit)
                .ToListAsync(ct);
        }

        public async Task<IEnumerable<SOSReport>> GetByStatusAsync(string status, CancellationToken ct = default)
        {
            return await _db.SOSReports
                .Where(r => r.Status == status)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

    }
}
