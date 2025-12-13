using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Sos.Infrastructure.Hubs
{
    public class TestHub : Hub
    {
        private readonly ILogger<TestHub> _logger;

        public TestHub(ILogger<TestHub> logger)
        {
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation(
                "Client connected: {ConnectionId}",
                Context.ConnectionId
            );

            await Clients.Caller.SendAsync(
                "ServerMessage",
                $"Kết nối thành công. ConnectionId: {Context.ConnectionId}"
            );

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            if (exception != null)
            {
                _logger.LogError(
                    exception,
                    "Client disconnected by error: {ConnectionId}",
                    Context.ConnectionId
                );
            }
            else
            {
                _logger.LogInformation(
                    "Client disconnected normally: {ConnectionId}",
                    Context.ConnectionId
                );
            }

            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Client gọi sau khi login xong
        /// role + status + userId lấy từ API
        /// </summary>
        public async Task JoinByRoleAndStatus(string role, string? status, Guid? userId)
        {
            role = role?.ToLower() ?? string.Empty; // Ensure role is not null
            status = status?.ToLower() ?? string.Empty; // Ensure status is not null

            if (role == "admin")
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "admin");
                await Clients.Caller.SendAsync("ServerMessage", "Bạn đã tham gia nhóm ADMIN");
                return;
            }

            if (role == "volunteer" && userId.HasValue)
            {
                if (status == "active")
                    await Groups.AddToGroupAsync(Context.ConnectionId, "volunteer_active");

                await Groups.AddToGroupAsync(
                    Context.ConnectionId,
                    $"volunteer_team_{userId}"
                );
            }
        }


    }
}
