// Services/SignalRNotificationService.cs
using Microsoft.AspNetCore.SignalR;
using SOS.Service.Interfaces;
using Sos.Infrastructure.Hubs;

namespace Sos.Application.Services
{
    public class SignalRNotificationService : INotificationService
    {
        private readonly IHubContext<SignalRHub> _hubContext;

        public SignalRNotificationService(IHubContext<SignalRHub> hubContext)
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
            
        public Task NotifyAdminsTaskCompleted(object payload)
        {
            return _hubContext.Clients
                .Group("admin")
                .SendAsync("NotifyAdminsTaskCompleted", payload);
        }

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

        public Task NotifyVerifiedVolunteer(Guid userId, object payload)
        {
            var groupName = $"volunteer_team_{userId}";

            return _hubContext.Clients
                .Group(groupName)
                .SendAsync("VerifiedVolunteer", payload);
        }

        public Task NotifyReportStatusChanged(Guid userId, object payload)
        {
            var groupName = $"user_{userId}";
            return _hubContext.Clients
                .Group(groupName)
                .SendAsync("ReportStatusChanged", payload);
        }
        public Task NotifyReportStatusChangedtoReject(Guid userId, object payload)
        {
            var groupName = $"user_{userId}";
            return _hubContext.Clients
                .Group(groupName)
                .SendAsync("ReportStatusChangedtoReject", payload);
        }
        public Task NotifyReportStatusChangedtoAccept(Guid userId, object payload)
        {
            var groupName = $"user_{userId}";
            return _hubContext.Clients
                .Group(groupName)
                .SendAsync("ReportStatusChangedtoAccept", payload);
        }
        
        public Task NotifyReportCancel(Guid userId, object payload)
        {
            var groupName = $"user_{userId}";
            return _hubContext.Clients
                .Group(groupName)
                .SendAsync("ReportCanceled", payload);
        }

        public Task NotifyNewSosRequesttoPending(Guid userId, object payload)
        {
            var groupName = $"user_{userId}";
            return _hubContext.Clients
                .Group(groupName)
                .SendAsync("NewSosRequesttoPending", payload);
        }
        public Task TaskCanceledRejected(Guid volunteerId, object payload)
        {
            var groupName = $"volunteer_team_{volunteerId}";
            return _hubContext.Clients
                .Group(groupName)
                .SendAsync("TaskCanceledRejected", payload);
        }

    }
}