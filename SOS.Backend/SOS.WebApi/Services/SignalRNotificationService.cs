// Services/SignalRNotificationService.cs
using Microsoft.AspNetCore.SignalR;
using Sos.WebApi.Hubs;
using SOS.Domain.Interfaces;

namespace Sos.Application.Services
{
    public class SignalRNotificationService : INotificationService
    {
        private readonly IHubContext<TestHub> _hubContext;

        public SignalRNotificationService(IHubContext<TestHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public Task NotifyReportCreatedAsync(object payload)
        {
            return _hubContext.Clients
                .Groups("admin", "volunteer_active")
                .SendAsync("ReportCreated", payload);
        }


        public Task NotifyAdminsTaskAccepted(object payload)
            => _hubContext.Clients.Group("admin").SendAsync("TaskAccepted", payload);

        // Các method khác tạm để trống
        public Task NotifyTaskCompleted(object payload) => Task.CompletedTask;

        public Task NotifyVolunteersTaskCanceled(object payload) => Task.CompletedTask;
        public Task NotifyAdminsTaskCompleted(object payload) => Task.CompletedTask;

        /// <summary>
        /// Đội cứu hộ gửi yêu cầu hủy task → báo ADMIN
        /// </summary>
        public Task NotifyVolunteersRequestTaskCanceled(object payload)
        {
            return _hubContext.Clients
                .Group("admin")
                .SendAsync("VolunteerRequestTaskCanceled", payload);
        }

        /// <summary>
        /// Admin chấp nhận hủy → báo CHỈ đội cứu hộ đó
        /// </summary>
        public Task NotifyTaskCanceled(Guid userId, object payload)
        {
            var groupName = $"volunteer_team_{userId}";

            return _hubContext.Clients
                .Group(groupName)
                .SendAsync("TaskCanceledApproved", payload);
        }

    }
}