
namespace SOS.Domain.Interfaces
{
    public interface INotificationService
    {
        Task NotifyVolunteersReportCreated(object payload);
        Task NotifyAdminsTaskAccepted(object payload);
        Task NotifyVolunteersTaskCanceled(object payload);
        Task NotifyAdminsTaskCompleted(object payload);

        Task NotifyVolunteersRequestTaskCanceled(object payload);
    }
}
