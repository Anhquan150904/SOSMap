using Sos.Application.DTOs.ReportSosDto;

namespace Sos.Application.Interfaces
{
    public interface IReportService
    {
        Task<Guid> CreateReportAsync(CreateReportRequest req);
        Task<ReportSummaryDto?> GetByIdAsync(Guid id);
        Task<IEnumerable<ReportSummaryDto>> GetNearbyAsync(string province);
        Task<IEnumerable<ReportSummaryDto>> GetReportsByStatusAsync(string status);

        Task<Guid> AcceptTaskAsync(Guid reportId, Guid volunteerId);
        Task RequestCancelTaskAsync(Guid taskId, Guid volunteerId, string? note);
        Task MarkTaskDoneAsync(Guid taskId, Guid volunteerId);

        Task<IEnumerable<TaskSummaryDto>> GetTasksByStatusAsync(string status);
    }
}
