namespace Sos.Domain.Entities
{
    // Báo cáo cứu trợ khẩn cấp
    public class SOSReport
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string? Name { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }

        public string Status { get; set; } = "pending"; // pending|accepted|in_progress|completed|canceled|fake|safe
        public string Level { get; set; } = "critical"; // critical|urgent|normal
        public string? Details { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
