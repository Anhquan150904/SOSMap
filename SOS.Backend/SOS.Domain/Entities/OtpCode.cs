namespace Sos.Domain.Entities
{
    public class OtpCode
    {
        public Guid Id { get; set; }

        public string PhoneNumber { get; set; } = null!;
        public string Code { get; set; } = null!;

        public DateTime ExpireAt { get; set; }
        public bool IsUsed { get; set; } = false;
    }
}
