using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SOS.Service.Interfaces
{
    public interface IAdminService
    {
        Task CancelTaskAsync(Guid taskId, Guid volunteerId);
        Task AcceptRequestVolunteer(Guid userId);

        Task AcceptSOSReport(Guid reportId);
    }
}
