using Microsoft.AspNetCore.Mvc;
using Sos.Application.Services;
using Sos.Application.DTOs.ReportSosDto;
using SOS.Service.Interfaces;
using Sos.Application.Interfaces;

namespace Sos.WebApi.Controllers
{
    [ApiController]
    [Route("api/reports")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _service;

        public ReportsController(IReportService service)
        {
            _service = service;
        }

        // Tạo báo cáo SOS
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateReportRequest req)
        {
            var reportId = await _service.CreateReportAsync(req);
            return CreatedAtAction(nameof(GetById), new { id = reportId }, new { id = reportId });
        }

        // Lấy báo cáo theo Id
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var report = await _service.GetByIdAsync(id);
            return report == null ? NotFound() : Ok(report);
        }

        // Lấy SOS gần khu vực
        [HttpGet]
        public async Task<IActionResult> GetNearby([FromQuery] string province)
        {
            var list = await _service.GetNearbyAsync(province);
            return Ok(list);
        }

        // Lấy SOS theo status
        [HttpGet("status/{status}")]
        public async Task<IActionResult> GetByStatus(string status)
        {
            var list = await _service.GetReportsByStatusAsync(status);
            return Ok(list);
        }

        // Nhận nhiệm vụ cứu hộ
        [HttpPost("{reportId:guid}/accept")]
        public async Task<IActionResult> Accept(Guid reportId, [FromBody] TaskActionRequest req)
        {
            var taskId = await _service.AcceptTaskAsync(reportId, req.VolunteerId);
            return Ok(new { taskId });
        }

        // Đội cứu hộ yêu cầu hủy nhiệm vụ
        [HttpPost("tasks/{taskId:guid}/request-cancel")]
        public async Task<IActionResult> RequestCancelTask(Guid taskId, [FromBody] TaskActionRequest req)
        {
            await _service.RequestCancelTaskAsync(taskId, req.VolunteerId, req.note);
            return Ok(new { requested = true });
        }

        // Hoàn thành nhiệm vụ
        [HttpPost("tasks/{taskId:guid}/done")]
        public async Task<IActionResult> DoneTask(Guid taskId, [FromBody] TaskActionRequest req)
        {
            await _service.MarkTaskDoneAsync(taskId, req.VolunteerId);
            return Ok(new { done = true });
        }

        // Lấy task theo status
        [HttpGet("tasks/status/{status}")]
        public async Task<IActionResult> GetTasksByStatus(string status)
        {
            var list = await _service.GetTasksByStatusAsync(status);
            return Ok(list);
        }
    }
}
