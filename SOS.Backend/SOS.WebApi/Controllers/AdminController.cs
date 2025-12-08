using Microsoft.AspNetCore.Mvc;
using Sos.Application.Services;
using Sos.Domain.Interfaces;
using SOS.Domain.Interfaces;
using Sos.Application.DTOs.ReportSosDto;

namespace Sos.WebApi.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private readonly AdminService _service;
        private readonly IUserRepository _userRepo;

        public AdminController(AdminService service, IUserRepository userRepo)
        {
            _service = service;
            _userRepo = userRepo;
        }
        // chấp nhận yêu cầu hủy nhiệm vụ cứu hộ
        [HttpPost("tasks/{taskId:guid}/cancel")]
        public async Task<IActionResult> CancelTask(Guid taskId, [FromBody] TaskActionRequest req)
        {
            await _service.CancelTaskAsync(taskId, req.VolunteerId, req.note);
            return Ok(new { canceled = true });
        }

        // chấp nhận yêu cầu trở thành người cứu hộ'
        [HttpPost("user/{userId:guid}/accept-to-volunteer")]
        public async Task<IActionResult> AcceptRequestVolunteer(Guid userId)
        {
            await _service.AcceptRequestVolunteer(userId);
            return Ok(new { canceled = true });
        }
    }
}
