using Microsoft.AspNetCore.Mvc;
using Sos.Application.Services;
using SOS.Service.Interfaces;
using Sos.Domain.Entities;
using SOS.Application.DTOs;
namespace Sos.WebApi.Controllers
{
    [ApiController]
    [Route("api/safety")]
    public class SafetyController : ControllerBase
    {
        private readonly ISafetyService _safetyService;
        public SafetyController(ISafetyService s) { _safetyService = s; }

        [HttpGet("nearby/{province}")]
        public async Task<IActionResult> Nearby(string province)
        {
            var pts = await _safetyService.GetNearbySafetyPointsAsync(province);
            return Ok(pts);
        }

        [HttpGet("get-by-status/{status}")]
        public async Task<IActionResult> GetByStatus(string status)
        {
            var pts = await _safetyService.GetSafetyByStatus(status);
            return Ok(pts);
        }

        [HttpPost("safetypoint/create")]
        public async Task<IActionResult> CreateNewSafetyPoint([FromBody] SafetyPoint point)
        {
            var createdPoint = await _safetyService.CreateNewSafetyPoinṭ̣̣(point);
            return Ok(createdPoint);
        }

        [HttpDelete("safetypoint/{id:guid}/delete")]
        public async Task<IActionResult> DeleteSafetyPoint(Guid id)
        {
            await _safetyService.DeletedSafetyPointAsync(id);
            return Ok(new { message = "Safety point deleted successfully" });
        }
        [HttpPut("safetypoint/{id:guid}/update")]
        public async Task<IActionResult> UpdateSafetyPoint(Guid id, [FromBody] SafetyUpdateDto point)
        {
            await _safetyService.UpdateSafetyPointAsync(id, point);
            return Ok(new { message = "Safety point updated successfully" });
        }
    }
}
