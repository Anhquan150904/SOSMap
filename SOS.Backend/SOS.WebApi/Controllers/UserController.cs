using Microsoft.AspNetCore.Mvc;
using Sos.Application.Services;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;

[ApiController]
[Route("api/user")]
public class UserController : ControllerBase
{
    private readonly IUserRepository _userRepo;

    public UserController(IUserRepository userRepo)
    {
        _userRepo = userRepo;
    }

    [HttpGet("{id}/address")]
    public async Task<IActionResult> GetUserAddress(Guid id)
    {
        var address = await _userRepo.GetAdressByIdAsync(id);
        if (address == null)
        {
            return NotFound("User not found or address not set");
        }
        return Ok(new { userId = id, address });
    }

    [HttpPost("{id}/address")]
    public async Task<IActionResult> UpdateUserAddress(Guid id, string address)
    {
        await _userRepo.UpdateLocationAsync(id, address);
        return Ok(new { message = "Address updated successfully" });
    }
}