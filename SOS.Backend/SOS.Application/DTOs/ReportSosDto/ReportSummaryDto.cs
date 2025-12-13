namespace Sos.Application.DTOs.ReportSosDto
{
    public class ReportSummaryDto
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string? Name { get; set; }
        public string? Phone { get; set; }
        public string Status { get; set; } = default!;
        public string Level { get; set; } = default!;
        public string? Details { get; set; }
        public string? Address { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
