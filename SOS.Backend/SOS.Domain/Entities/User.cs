using NetTopologySuite.Geometries;
namespace Sos.Domain.Entities
{
    // người dùng
    public class User
    {
        public Guid Id { get; set; }
        public string Phone { get; set; } = null!;
        public string? FullName { get; set; }
        public string Role { get; set; } = "citizen"; // citizen|volunteer|admin
        public string Status { get; set; } = "active"; // active|blocked

        public string? Address { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
