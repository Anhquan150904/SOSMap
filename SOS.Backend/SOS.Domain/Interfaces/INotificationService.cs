
namespace SOS.Domain.Interfaces
{
    public interface INotificationService
    {
        Task NotifyReportCreatedAsync(object payload);
        Task NotifyAdminsTaskAccepted(object payload);
        Task NotifyTaskCanceled(Guid volunteerId, object payload);
        Task NotifyAdminsTaskCompleted(object payload);

        Task NotifyVolunteersRequestTaskCanceled(object payload);
    }
}
