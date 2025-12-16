using Sos.Domain.Entities;

namespace Sos.Application.DTOs.OtpDto
{
    // Sos.Application.DTOs.OtpDto.AuthResultDto.cs
    public class AuthResultDto
    {
        public Guid UserId { get; set; }
        public string? FullName { get; set; }
        public string Phone { get; set; } = default!;
        public string Role { get; set; } = default!;
        public string? Status { get; set; }

        public AuthResultDto() { }

        public AuthResultDto(User user)
        {
            UserId = user.Id;
            FullName = user.FullName;
            Phone = user.Phone;
            Role = user.Role;
            Status = user.Status;
        }
    }

    public class AuthVolunteerResultDto : AuthResultDto
    {
        public string Message { get; set; } = default!;
    }

}

