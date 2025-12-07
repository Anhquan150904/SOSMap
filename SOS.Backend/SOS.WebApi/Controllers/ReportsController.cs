using Microsoft.AspNetCore.Mvc;
using Sos.Application.Services;
using Sos.Domain.Interfaces;
using SOS.Domain.Interfaces;
using Sos.Application.DTOs.ReportSosDto;

namespace Sos.WebApi.Controllers
{
    [ApiController]
    [Route("api/reports")]
    public class ReportsController : ControllerBase
    {
        private readonly ReportService _service;
        private readonly IUserRepository _userRepo;

        public ReportsController(ReportService service, IUserRepository userRepo)
        {
            _service = service;
            _userRepo = userRepo;
        }

        // Tạo báo cáo SOS
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateReportRequest req)
        {
            var user = await _userRepo.GetByPhoneAsync(req.Phone);
            if (user == null) return BadRequest("User not found - authenticate first");

            var reportId = await _service.CreateReportAsync(
                user.Id, req.Name, req.Phone, req.Lat, req.Lng, req.Address, req.Details, req.Level
            );

            return CreatedAtAction(nameof(GetById), new { id = reportId }, new { id = reportId });
        }

        // Lấy báo cáo theo Id
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id, [FromServices] IReportRepository repo)
        {
            var r = await repo.GetByIdAsync(id);
            if (r == null) return NotFound();

            return Ok(new
            {
                id = r.Id,
                name = r.Name,
                phone = r.Phone,
                address = r.Address,
                lat = r.Location.Y,
                lng = r.Location.X,
                status = r.Status,
                level = r.Level,
                details = r.Details,
                createdAt = r.CreatedAt
            });
        }

        // Lấy danh sách SOS gần vị trí
        [HttpGet]
        public async Task<IActionResult> GetNearby([FromQuery] double lat, [FromQuery] double lng, [FromQuery] double radiusMeters = 2000)
        {
            var list = await _service.GetNearbyAsync(lat, lng, radiusMeters);
            return Ok(list);
        }

        // Nhận nhiệm vụ cứu hộ
        [HttpPost("{reportId:guid}/accept")]
        public async Task<IActionResult> Accept(Guid reportId, [FromBody] TaskActionRequest req)
        {
            var taskId = await _service.AcceptTaskAsync(reportId, req.VolunteerId);
            return Ok(new { taskId });
        }

        // Hủy nhiệm vụ cứu hộ
        [HttpPost("tasks/{taskId:guid}/cancel")]
        public async Task<IActionResult> CancelTask(Guid taskId, [FromBody] TaskActionRequest req)
        {
            await _service.CancelTaskAsync(taskId, req.VolunteerId);
            return Ok(new { canceled = true });
        }

        // Hoàn thành nhiệm vụ cứu hộ
        [HttpPost("tasks/{taskId:guid}/done")]
        public async Task<IActionResult> DoneTask(Guid taskId, [FromBody] TaskActionRequest req)
        {
            await _service.MarkTaskDoneAsync(taskId, req.VolunteerId);
            return Ok(new { done = true });
        }

        // Lấy các điểm an toàn gần vị trí
        [HttpGet("safety-points")]
        public async Task<IActionResult> GetNearbySafetyPoints([FromQuery] double lat, [FromQuery] double lng, [FromQuery] double radiusMeters = 5000)
        {
            var list = await _service.GetNearbySafetyPointsAsync(lat, lng, radiusMeters);
            return Ok(list);
        }
    }
}
