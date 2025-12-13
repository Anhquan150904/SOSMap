namespace Sos.Application.DTOs.ReportSosDto
{
    public class TaskSummaryDto
    {
        public Guid Id { get; set; }
        public Guid ReportId { get; set; }
        public Guid VolunteerId { get; set; }
        public string Status { get; set; } = default!;
        public DateTime CreatedAt { get; set; }
    }
}
