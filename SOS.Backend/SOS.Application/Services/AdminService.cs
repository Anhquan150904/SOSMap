using NetTopologySuite;
using NetTopologySuite.Geometries;
using Sos.Domain.Interfaces;
using SOS.Service.Interfaces;
using System;

namespace Sos.Application.Services
{
    public class AdminService : IAdminService
    {
        private readonly IReportRepository _repo;
        private readonly IUserRepository _userRepo;
        private readonly IRescueTaskRepository _taskRepo;
        private readonly INotificationService _notification;
        private readonly IReportRepository _reportRepository;

        public AdminService(
            IReportRepository repo,
            IUserRepository userRepo,
            IRescueTaskRepository taskRepo,
            INotificationService notification,
            IReportRepository reportRepository)
        {
            _repo = repo;
            _userRepo = userRepo;
            _taskRepo = taskRepo;
            _notification = notification;
            _reportRepository = reportRepository;
        }

        public async Task CancelTaskAsync(Guid taskId, Guid volunteerId)
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
            var payload = new
            {
                Message = $"Admin đã chấp nhận yêu cầu hủy Task {taskId} của bạn",
                TaskId = taskId,
                ReportId = task.ReportId

            };
            await _notification.NotifyTaskCanceled(volunteerId, payload);
            await _notification.NotifyReportCancel(report.UserId, new
            {
                Message = "Báo cáo của bạn đã được hủy bỏ do đội cứu hộ không thể thực hiện nhiệm vụ."
            });
        }

        public async Task NotCancelTaskAsync(Guid taskId, Guid volunteerId)
        {
            var task = await _taskRepo.GetByIdAsync(taskId);
            if (task == null) throw new KeyNotFoundException("Task not found");
            if (task.VolunteerId != volunteerId) throw new UnauthorizedAccessException("Not your task");

            task.Status = "in_progress";
            await _taskRepo.UpdateAsync(task);
            var payload = new
            {
                Message = $"Admin không chấp nhận yêu cầu hủy Task {taskId} của bạn",

            };
            await _notification.NotifyTaskCanceled(volunteerId, payload);
        }

        public async Task AcceptRequestVolunteer(Guid userId)
        {
            var user = await _userRepo.GetByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            user.Status = "active";
            await _userRepo.UpdateAsync(user);
            await _notification.NotifyVerifiedVolunteer(userId, new
            {
                Message = "Yêu cầu trở thành tình nguyện viên của bạn đã được chấp nhận."
            });
        }
        public async Task AcceptSOSReport(Guid reportId)
        {
            var report = await _reportRepository.GetByIdAsync(reportId);
            report.Status = "accepted";
            await _reportRepository.UpdateAsync(report);

            await _notification.NotifyReportStatusChanged(report.UserId, new
            {
                Message = "Báo cáo của bạn đã được chấp nhận và đang trong quá trình xử lý."
            });
        }

        public async Task RejectSOSReport(Guid reportId)
        {
            var report = await _reportRepository.GetByIdAsync(reportId);
            await _reportRepository.DeleteAsync(reportId);
            await _notification.NotifyReportStatusChanged(report.UserId, new
            {
                Message = "Báo cáo của bạn đã bị từ chối."
            });
        }
    }


}