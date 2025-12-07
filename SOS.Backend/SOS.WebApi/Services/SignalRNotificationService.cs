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

        public Task NotifyVolunteersReportCreated(object payload)
            => _hubContext.Clients.Group("volunteer").SendAsync("ReportCreated", payload);

        public Task NotifyAdminsTaskAccepted(object payload)
            => _hubContext.Clients.Group("admin").SendAsync("TaskAccepted", payload);

        // Các method khác tạm để trống
        public Task NotifyTaskCanceled(object payload) => Task.CompletedTask;
        public Task NotifyTaskCompleted(object payload) => Task.CompletedTask;

        public Task NotifyVolunteersTaskCanceled(object payload) => Task.CompletedTask;
        public Task NotifyAdminsTaskCompleted(object payload) => Task.CompletedTask;

    }
}