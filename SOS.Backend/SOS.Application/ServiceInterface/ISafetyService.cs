using Sos.Domain.Entities;
using SOS.Application.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SOS.Service.Interfaces
{
    public interface ISafetyService
    {
        Task<IEnumerable<object>> GetNearbySafetyPointsAsync(string province);
        Task<SafetyPoint> CreateNewSafetyPoinṭ̣̣ (SafetyPoint point);

        Task DeletedSafetyPointAsync(Guid id);
        Task UpdateSafetyPointAsync(Guid id, SafetyUpdateDto point);
        Task<List<SafetyPoint?>> GetSafetyByStatus(string status);
    }
}
