
namespace SOS.Service.Interfaces
{
    public interface INotificationService
    {
        Task NotifyReportCreatedAsync(object payload);
        Task NotifyAdminsTaskAccepted(object payload);
        Task NotifyTaskCanceled(Guid volunteerId, object payload);

        Task NotifyAdminsTaskCompleted(object payload);

        Task NotifyVolunteersRequestTaskCanceled(object payload);

        // phía người dân
        Task NotifyReportStatusChanged(Guid userId, object payload);
        Task NotifyReportCancel (Guid userId, object payload);
    }
}
