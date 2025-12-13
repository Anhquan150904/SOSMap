// File: Sos.Application/Services/ReportService.cs
using NetTopologySuite;
using NetTopologySuite.Geometries;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;
using SOS.Service.Interfaces;

namespace Sos.Application.Services
{
    public class SafetyService : ISafetyService
    {
        private readonly ISafetyPointRepository _safetyRepo;

        public SafetyService(
            ISafetyPointRepository safetyRepo)
        {
            _safetyRepo = safetyRepo;
        }

        public async Task<IEnumerable<object>> GetNearbySafetyPointsAsync(string province)
        {
            var pts = await _safetyRepo.FindNearbyAsync(province);
            return pts.Select(p => new { id = p.Id, name = p.Name, type = p.Type, address = p.Address });
        }
    }
}
