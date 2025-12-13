using Microsoft.AspNetCore.Mvc;
using Sos.Application.Services;
using SOS.Service.Interfaces;

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
    }
}
