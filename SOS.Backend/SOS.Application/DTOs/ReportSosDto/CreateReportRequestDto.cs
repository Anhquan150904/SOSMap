

namespace Sos.Application.DTOs.ReportSosDto
{
    public record CreateReportRequest(
        string Phone, 
        string? Name, 
        double Lat, 
        double Lng, 
        string? Address, 
        string? Details, 
        string Level = "critical"
    );
}
