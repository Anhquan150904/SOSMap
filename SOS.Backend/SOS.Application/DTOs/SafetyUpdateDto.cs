using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SOS.Application.DTOs
{
    public record SafetyUpdateDto(
        string? Name,
        string? Type,
        string ?Address,
        string ?Description,
        string? Status,
        DateTime UpdatedAt
    );

}
