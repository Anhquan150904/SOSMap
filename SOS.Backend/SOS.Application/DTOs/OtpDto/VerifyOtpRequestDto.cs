
namespace Sos.Application.DTOs.OtpDto
{
    public record VerifyOtpRequest(
        string Phone, 
        string FullName, 
        string Code, 
        double Lat, 
        double Lng
    );
}
