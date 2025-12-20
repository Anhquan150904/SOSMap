// File: Sos.Application/Services/ReportService.cs
using NetTopologySuite;
using NetTopologySuite.Geometries;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;
using SOS.Application.DTOs;
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
            return pts.Select(p => new { id = p.Id, name = p.Name, type = p.Type, address = p.Address, status = p.Status });
        }

        public async Task<SafetyPoint> CreateNewSafetyPoinṭ̣̣ (SafetyPoint point)
        {
            await _safetyRepo.AddAsync(point);
            return point;
        }
        public async Task DeletedSafetyPointAsync(Guid id)
        {
            await _safetyRepo.DeletedAsync(id);
        }
        public async Task UpdateSafetyPointAsync(Guid id, SafetyUpdateDto dto)
        {
            var entity = await _safetyRepo.GetByIdAsync(id);
            if (entity == null)
                throw new KeyNotFoundException("SafetyPoint not found");

            if (dto.Name != null) entity.Name = dto.Name;
            if (dto.Type != null) entity.Type = dto.Type;
            if (dto.Address != null) entity.Address = dto.Address;
            if (dto.Description != null) entity.Description = dto.Description;
            if (dto.Status !=null) entity.Status = dto.Status;

            entity.UpdatedAt = DateTime.UtcNow;

            await _safetyRepo.UpdateAsync();
        }

        public async Task<List<SafetyPoint?>> GetSafetyByStatus(string status)
        {
            return await _safetyRepo.GetSafetyByStatus(status);
        }
    }
}
