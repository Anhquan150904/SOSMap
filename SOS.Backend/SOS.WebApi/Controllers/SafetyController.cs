using Microsoft.AspNetCore.Mvc;
using Sos.Application.Services;

namespace Sos.WebApi.Controllers
{
    [ApiController]
    [Route("api/safety")]
    public class SafetyController : ControllerBase
    {
        private readonly ReportService _reportService;
        public SafetyController(ReportService s) { _reportService = s; }

        [HttpGet("nearby")]
        public async Task<IActionResult> Nearby([FromQuery] double lat, [FromQuery] double lng, [FromQuery] double radiusMeters = 5000)
        {
            var pts = await _reportService.GetNearbySafetyPointsAsync(lat, lng, radiusMeters);
            return Ok(pts);
        }
    }
}
