// File: Sos.Application/Services/ReportService.cs
using NetTopologySuite;
using NetTopologySuite.Geometries;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;
using SOS.Domain.Interfaces;

namespace Sos.Application.Services
{
    public class ReportService
    {
        private readonly IReportRepository _repo;
        private readonly IUserRepository _userRepo;
        private readonly IRescueTaskRepository _taskRepo;
        private readonly ISafetyPointRepository _safetyRepo;
        private readonly INotificationService _notification;
        private readonly GeometryFactory _geomFactory;

        public ReportService(
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

        public async Task<Guid> CreateReportAsync(Guid userId, string? name, string? phone, double lat, double lng, string? address, string? details, string level = "critical")
        {
            var point = _geomFactory.CreatePoint(new Coordinate(lng, lat));
            var report = new SOSReport
            {
                UserId = userId,
                Name = name,
                Phone = phone,
                Address = address,
                Location = point,
                Details = details,
                Level = level,
                Status = "pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _repo.AddAsync(report);

            await _notification.NotifyVolunteersReportCreated(new
            {
                id = report.Id,
                lat,
                lng,
                level = report.Level,
                status = report.Status,
                details = report.Details,
                address = report.Address
            });

            return report.Id;
        }

        public async Task<IEnumerable<object>> GetNearbyAsync(double lat, double lng, double radiusMeters = 2000)
        {
            var res = await _repo.FindNearbyAsync(lat, lng, radiusMeters);
            return res.Select(r => new {
                id = r.Id,
                lat = r.Location.Y,
                lng = r.Location.X,
                status = r.Status,
                level = r.Level,
                details = r.Details,
                address = r.Address,
                createdAt = r.CreatedAt
            });
        }

        public async Task<Guid> AcceptTaskAsync(Guid reportId, Guid volunteerId)
        {
            var report = await _repo.GetByIdAsync(reportId);
            if (report == null) throw new KeyNotFoundException("Report not found");
            if (report.Status == "completed" || report.Status == "canceled") throw new InvalidOperationException("Cannot accept closed report");

            var existing = await _taskRepo.GetByReportIdAsync(reportId);
            if (existing != null) throw new InvalidOperationException("Already assigned");

            var task = new RescueTask
            {
                ReportId = reportId,
                VolunteerId = volunteerId,
                Status = "accepted",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _taskRepo.AddAsync(task);

            report.Status = "accepted";
            report.UpdatedAt = DateTime.UtcNow;
            await _repo.UpdateAsync(report);

            await _notification.NotifyAdminsTaskAccepted(new { reportId, volunteerId });

            return task.Id;
        }

        public async Task CancelTaskAsync(Guid taskId, Guid volunteerId)
        {
            var task = await _taskRepo.GetByIdAsync(taskId);
            if (task == null) throw new KeyNotFoundException("Task not found");
            if (task.VolunteerId != volunteerId) throw new UnauthorizedAccessException("Not your task");

            task.Status = "canceled";
            task.UpdatedAt = DateTime.UtcNow;
            await _taskRepo.UpdateAsync(task);

            var report = await _repo.GetByIdAsync(task.ReportId);
            if (report != null)
            {
                report.Status = "pending";
                report.UpdatedAt = DateTime.UtcNow;
                await _repo.UpdateAsync(report);
            }

            await _notification.NotifyVolunteersTaskCanceled(new { taskId, reportId = task.ReportId });
        }

        public async Task MarkTaskDoneAsync(Guid taskId, Guid volunteerId)
        {
            var task = await _taskRepo.GetByIdAsync(taskId);
            if (task == null) throw new KeyNotFoundException("Task not found");
            if (task.VolunteerId != volunteerId) throw new UnauthorizedAccessException("Not your task");

            task.Status = "done";
            task.UpdatedAt = DateTime.UtcNow;
            await _taskRepo.UpdateAsync(task);

            var report = await _repo.GetByIdAsync(task.ReportId);
            if (report != null)
            {
                report.Status = "completed";
                report.UpdatedAt = DateTime.UtcNow;
                await _repo.UpdateAsync(report);
            }

            await _notification.NotifyAdminsTaskCompleted(new { taskId, reportId = task.ReportId });
        }

        public async Task<IEnumerable<object>> GetNearbySafetyPointsAsync(double lat, double lng, double radiusMeters = 5000)
        {
            var pts = await _safetyRepo.FindNearbyAsync(lat, lng, radiusMeters);
            return pts.Select(p => new { id = p.Id, name = p.Name, type = p.Type, address = p.Address, lat = p.Location.Y, lng = p.Location.X });
        }
    }
}
