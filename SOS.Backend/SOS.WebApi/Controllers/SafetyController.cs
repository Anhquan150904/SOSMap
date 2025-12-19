using Microsoft.AspNetCore.Mvc;
using Sos.Application.Services;
using SOS.Service.Interfaces;
using Sos.Domain.Entities;
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

        [HttpPost("safetypoint/create")]
        public async Task<IActionResult> CreateNewSafetyPoint([FromBody] SafetyPoint point)
        {
            var createdPoint = await _safetyService.CreateNewSafetyPoinṭ̣̣(point);
            return Ok(createdPoint);
        }
    }
}
