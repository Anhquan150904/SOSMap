using Sos.Domain.Entities;

namespace Sos.Domain.Interfaces
{
    // Repository điểm an toàn
    public interface ISafetyPointRepository
    {
        Task<IEnumerable<SafetyPoint>> FindNearbyAsync(double lat, double lng, double radiusMeters, int limit = 50, CancellationToken ct = default);
        Task AddAsync(SafetyPoint p, CancellationToken ct = default);
    }
}
