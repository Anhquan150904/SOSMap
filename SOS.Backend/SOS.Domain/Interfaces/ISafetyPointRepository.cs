using Sos.Domain.Entities;

namespace Sos.Domain.Interfaces
{
    // Repository điểm an toàn
    public interface ISafetyPointRepository
    {
        Task<IEnumerable<SafetyPoint>> FindNearbyAsync(string province, int limit = 50, CancellationToken ct = default);
        Task AddAsync(SafetyPoint p, CancellationToken ct = default);
    }
}
