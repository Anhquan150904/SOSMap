namespace Sos.Domain.Entities
{
    // Bảng nhiệm vụ cứu trợ được giao cho tình nguyện viên
    public class RescueTask
    {
        public Guid Id { get; set; }
        public Guid ReportId { get; set; }
        public Guid VolunteerId { get; set; }
        public string Status { get; set; } = "accepted"; // accepted|in_progress|canceled|done|unreachable
        public string? Note { get; set; } // Khi muốn hủy - Note là lí do để gửi admin duyệt
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
