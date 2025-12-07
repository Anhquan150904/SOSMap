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

        [HttpGet("nearby/{province}")]
        public async Task<IActionResult> Nearby(string province)
        {
            var pts = await _reportService.GetNearbySafetyPointsAsync(province);
            return Ok(pts);
        }
    }
}
