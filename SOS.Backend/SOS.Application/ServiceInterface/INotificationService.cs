
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
        Task NotifyReportStatusChangedtoReject(Guid userId, object payload);
        Task NotifyReportStatusChangedtoAccept(Guid userId, object payload);
        Task NotifyReportStatusChanged(Guid userId, object payload);
        Task NotifyReportCancel (Guid userId, object payload);
        Task NotifyVerifiedVolunteer(Guid userId, object payload);

        Task TaskCanceledRejected(Guid volunteerId, object payload);
        Task NotifyNewSosRequesttoPending(Guid userId,object payload);

    }
}
