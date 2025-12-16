using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SOS.Application.DTOs.OtpDto
{
    public class OtpGenerateResult
    {
        public string Code { get; set; } = string.Empty;
        public bool IsExistingUser { get; set; }
    }
}
