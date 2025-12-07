

namespace Sos.Application.DTOs.ReportSosDto
{
    public record CreateReportRequest(
        string Phone, 
        string? Name,
        string? Address, 
        string? Details, 
        string Level = "critical"
    );
}
