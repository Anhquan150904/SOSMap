using NetTopologySuite.Geometries;

namespace Sos.Domain.Entities
{
    // điểm an toàn
    public class SafetyPoint
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = null!;
        public string Type { get; set; } = "shelter"; // shelter|food|medical|warehouse
        public string? Address { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
