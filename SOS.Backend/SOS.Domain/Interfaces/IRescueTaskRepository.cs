using Sos.Domain.Entities;

namespace Sos.Domain.Interfaces
{
    // Repository nhiệm vụ cứu trợ được giao cho tình nguyện viên
    public interface IRescueTaskRepository
    {
        Task AddAsync(RescueTask task, CancellationToken ct = default);
        Task<RescueTask?> GetByReportIdAsync(Guid reportId, CancellationToken ct = default);
        Task<RescueTask?> GetByIdAsync(Guid id, CancellationToken ct = default);
        Task UpdateAsync(RescueTask task, CancellationToken ct = default);
    }
}
