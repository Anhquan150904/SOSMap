using Sos.Domain.Entities;

namespace Sos.Domain.Interfaces
{
    // Repository báo cáo cứu trợ khẩn cấp
    public interface IReportRepository
    {
        Task AddAsync(SOSReport report, CancellationToken ct = default);
        Task<SOSReport?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task UpdateAsync(SOSReport report, CancellationToken ct = default);
        Task<IEnumerable<SOSReport>> FindNearbyAsync(double lat, double lng, double radiusMeters, int limit = 200, CancellationToken ct = default);
    }
}
