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
    }
}
