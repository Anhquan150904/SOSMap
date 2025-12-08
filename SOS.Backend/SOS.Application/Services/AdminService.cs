using NetTopologySuite;
using NetTopologySuite.Geometries;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;
using SOS.Domain.Interfaces;

namespace Sos.Application.Services
{
    public class AdminService
    {
        private readonly IReportRepository _repo;
        private readonly IUserRepository _userRepo;
        private readonly IRescueTaskRepository _taskRepo;
        private readonly ISafetyPointRepository _safetyRepo;
        private readonly INotificationService _notification;
        private readonly GeometryFactory _geomFactory;

        public AdminService(
            IReportRepository repo,
            IUserRepository userRepo,
            IRescueTaskRepository taskRepo,
            ISafetyPointRepository safetyRepo,
            INotificationService notification)
        {
            _repo = repo;
            _userRepo = userRepo;
            _taskRepo = taskRepo;
            _safetyRepo = safetyRepo;
            _notification = notification;
            _geomFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);
        }

        public async Task CancelTaskAsync(Guid taskId, Guid volunteerId, string? note)
        {
            var task = await _taskRepo.GetByIdAsync(taskId);
            if (task == null) throw new KeyNotFoundException("Task not found");
            if (task.VolunteerId != volunteerId) throw new UnauthorizedAccessException("Not your task");

            await _taskRepo.DeleteTaskById(taskId);

            var report = await _repo.GetByIdAsync(task.ReportId);
            if (report != null)
            {
                report.Status = "accepted";
                report.UpdatedAt = DateTime.UtcNow;
                await _repo.UpdateAsync(report);
            }

            await _notification.NotifyVolunteersTaskCanceled(new { taskId, reportId = task.ReportId });
        }

        public async Task AcceptRequestVolunteer(Guid userId)
        {
            var user = await _userRepo.GetByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            user.Role = "active";
        }


    }
}