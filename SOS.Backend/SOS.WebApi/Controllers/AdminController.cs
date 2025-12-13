using Microsoft.AspNetCore.Mvc;
using Sos.Application.Services;
using Sos.Domain.Interfaces;
using SOS.Service.Interfaces;
using Sos.Application.DTOs.ReportSosDto;

namespace Sos.WebApi.Controllers
{
    [ApiController]
    [Route("api/admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _service;

        public AdminController(IAdminService service)
        {
            _service = service;
        }
        // chấp nhận yêu cầu hủy nhiệm vụ cứu hộ
        [HttpPost("tasks/{taskId:guid}/cancel")]
        public async Task<IActionResult> CancelTask(Guid taskId, Guid volunteerId)
        {
            await _service.CancelTaskAsync(taskId, volunteerId);
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
