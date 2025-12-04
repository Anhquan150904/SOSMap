// Hubs/TestHub.cs
using Microsoft.AspNetCore.SignalR;
using SOS.Domain.Interfaces;
using Microsoft.Extensions.Logging;   // <--- THÊM DÒNG NÀY

namespace Sos.WebApi.Hubs
{
    public class TestHub : Hub
    {
        private readonly INotificationService _notificationService;
        private readonly ILogger<TestHub> _logger;   // <--- THÊM LOGGER

        public TestHub(INotificationService notificationService, ILogger<TestHub> logger)
        {
            _notificationService = notificationService;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation("Client kết nối thành công: {ConnectionId}", Context.ConnectionId);
            await Clients.Caller.SendAsync("ServerMessage", $"Chào! ConnectionId: {Context.ConnectionId}");
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (exception != null)
            {
                _logger.LogError(exception, "Client bị ngắt kết nối DO LỖI: {ConnectionId}", Context.ConnectionId);
            }
            else
            {
                _logger.LogWarning("Client ngắt bình thường: {ConnectionId}", Context.ConnectionId);
            }
            await base.OnDisconnectedAsync(exception);
        }

        public async Task JoinGroup(string groupName)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(groupName))
                {
                    await Clients.Caller.SendAsync("ServerMessage", "Tên nhóm không hợp lệ!");
                    return;
                }

                groupName = groupName.ToLower();
                await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
                _logger.LogInformation("Client {ConnectionId} đã join nhóm {GroupName}", Context.ConnectionId.Substring(0, 8), groupName);

                await Clients.Caller.SendAsync("ServerMessage", $"Đã tham gia nhóm: {groupName}");
                await Clients.Group(groupName).SendAsync("ServerMessage",
                    $"User {Context.ConnectionId.Substring(0, 8)}... vừa vào nhóm {groupName}!");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "LỖI TRONG JoinGroup - Client: {ConnectionId}", Context.ConnectionId);
                await Clients.Caller.SendAsync("ServerMessage", $"Lỗi JoinGroup: {ex.Message}");
            }
        }

        public async Task SendTestNotification(string groupName, string message)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(groupName) || string.IsNullOrWhiteSpace(message))
                {
                    await Clients.Caller.SendAsync("ServerMessage", "Thiếu dữ liệu!");
                    return;
                }

                _logger.LogInformation("Client {ConnectionId} gửi test notification tới nhóm {GroupName}",
                    Context.ConnectionId.Substring(0, 8), groupName);

                var payload = new
                {
                    Id = Guid.NewGuid(),
                    Message = message,
                    FromConnectionId = Context.ConnectionId,
                    Timestamp = DateTime.UtcNow
                };

                if (groupName.Equals("volunteer", StringComparison.OrdinalIgnoreCase))
                {
                    await _notificationService.NotifyVolunteersReportCreated(payload);
                }
                else if (groupName.Equals("admin", StringComparison.OrdinalIgnoreCase))
                {
                    await _notificationService.NotifyAdminsTaskAccepted(payload);
                }

                await Clients.Caller.SendAsync("ServerMessage", "Gửi test notification thành công!");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "LỖI TRONG SendTestNotification - Client: {ConnectionId}", Context.ConnectionId);
                await Clients.Caller.SendAsync("ServerMessage", $"Lỗi gửi: {ex.Message}");
            }
        }
    }
}