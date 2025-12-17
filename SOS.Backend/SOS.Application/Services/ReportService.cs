using Sos.Application.DTOs.ReportSosDto;
using Sos.Application.Interfaces;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;
using SOS.Service.Interfaces;

namespace Sos.Application.Services
{
    public class ReportService : IReportService
    {
        private readonly IReportRepository _reportRepo;
        private readonly IUserRepository _userRepo;
        private readonly IRescueTaskRepository _taskRepo;
        private readonly INotificationService _notification;

        public ReportService(
            IReportRepository reportRepo,
            IUserRepository userRepo,
            IRescueTaskRepository taskRepo,
            INotificationService notification)
        {
            _reportRepo = reportRepo;
            _userRepo = userRepo;
            _taskRepo = taskRepo;
            _notification = notification;
        }

        // =========================
        // CREATE REPORT
        // =========================
        public async Task<Guid> CreateReportAsync(CreateReportRequest req)
        {
            var user = await _userRepo.GetByPhoneAsync(req.Phone);
            if (user == null)
                throw new InvalidOperationException("User must authenticate first");

            var report = new SOSReport
            {
                UserId = user.Id,
                Name = req.Name,
                Phone = req.Phone,
                Address = req.Address,
                Details = req.Details,
                Level = req.Level ?? "critical",
                Status = "pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _reportRepo.AddAsync(report);

            await _notification.NotifyReportCreatedAsync(new
            {
                id = report.Id,
                level = report.Level,
                status = report.Status,
                address = report.Address
            });

            return report.Id;
        }

        public async Task<ReportSummaryDto?> GetByIdAsync(Guid id)
        {
            var r = await _reportRepo.GetByIdAsync(id);
            if (r == null) return null;

            return MapReport(r);
        }

        public async Task<IEnumerable<ReportSummaryDto>> GetNearbyAsync(string province)
        {
            var res = await _reportRepo.FindNearbyAsync(province);
            return res.Select(MapReport);
        }

        public async Task<IEnumerable<ReportSummaryDto>> GetReportsByStatusAsync(string status)
        {
            var res = await _reportRepo.GetByStatusAsync(status);
            return res.Select(MapReport);
        }


        public async Task<Guid> AcceptTaskAsync(Guid reportId, Guid volunteerId)
        {
            var report = await _reportRepo.GetByIdAsync(reportId)
                ?? throw new KeyNotFoundException("Report not found");

            if (report.Status is "completed" or "canceled")
                throw new InvalidOperationException("Report closed");

            if (await _taskRepo.GetByReportIdAsync(reportId) != null)
                throw new InvalidOperationException("Task already assigned");

            var task = new RescueTask
            {
                ReportId = reportId,
                VolunteerId = volunteerId,
                Status = "in_progress",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _taskRepo.AddAsync(task);

            report.Status = "accepted";
            report.UpdatedAt = DateTime.UtcNow;
            await _reportRepo.UpdateAsync(report);

            await _notification.NotifyAdminsTaskAccepted(new { reportId, volunteerId, task.Id });

            return task.Id;
        }

        public async Task RequestCancelTaskAsync(Guid taskId, Guid volunteerId, string? note)
        {
            var task = await _taskRepo.GetByIdAsync(taskId)
                ?? throw new KeyNotFoundException("Task not found");

            if (task.VolunteerId != volunteerId)
                throw new UnauthorizedAccessException();

            task.Status = "pending-to-canceled";
            task.Note = note;
            task.UpdatedAt = DateTime.UtcNow;

            await _taskRepo.UpdateAsync(task);

            await _notification.NotifyVolunteersRequestTaskCanceled(new
            {
                taskId,
                volunteerId,
                note
            });
        }

        public async Task MarkTaskDoneAsync(Guid taskId, Guid volunteerId)
        {
            var task = await _taskRepo.GetByIdAsync(taskId)
                ?? throw new KeyNotFoundException();

            if (task.VolunteerId != volunteerId)
                throw new UnauthorizedAccessException();

            task.Status = "done";
            task.UpdatedAt = DateTime.UtcNow;
            await _taskRepo.UpdateAsync(task);

            var report = await _reportRepo.GetByIdAsync(task.ReportId);
            if (report != null)
            {
                report.Status = "completed";
                report.UpdatedAt = DateTime.UtcNow;
                await _reportRepo.UpdateAsync(report);
            }

            await _notification.NotifyAdminsTaskCompleted(new
            {
                taskId,
                volunteerId,
                reportId = task.ReportId
            });
        }

        public async Task<IEnumerable<TaskSummaryDto>> GetTasksByStatusAsync(string status)
        {
            var tasks = await _taskRepo.GetByStatusAsync(status);

            return tasks.Select(t => new TaskSummaryDto
            {
                Id = t.Id,
                ReportId = t.ReportId,
                VolunteerId = t.VolunteerId,
                Status = t.Status,
                CreatedAt = t.CreatedAt
            });
        }

        public async Task<RescueTask?> GetTask (Guid reportId)
        {
            return await _taskRepo.GetTask(reportId);
        }


        private static ReportSummaryDto MapReport(SOSReport r) => new()
        {
            Id = r.Id,
            UserId = r.UserId,
            Name = r.Name,
            Phone = r.Phone,
            Status = r.Status,
            Level = r.Level,
            Details = r.Details,
            Address = r.Address,
            CreatedAt = r.CreatedAt
        };
    }
}
