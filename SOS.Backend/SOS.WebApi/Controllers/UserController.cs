using Microsoft.AspNetCore.Mvc;
using Sos.Application.Service.Interfaces;
using Sos.Application.Services;

[ApiController]
[Route("api/user")]
public class UserController : ControllerBase
{
    private readonly IUserService _service;

    public UserController(IUserService service)
    {
        _service = service;
    }

    [HttpGet("{id:guid}/get-user-by-id")]
    public async Task<IActionResult> GetUserbyID(Guid id)
    {
        var User = await _service.GetUsersIDAsync(id);
        if (User == null)
            return NotFound("User not found");

        return Ok(new { userId = id, User });
    }

    // Lấy địa chỉ user
    [HttpGet("{id:guid}/address")]
    public async Task<IActionResult> GetUserAddress(Guid id)
    {
        var address = await _service.GetUserAddressAsync(id);
        if (address == null)
            return NotFound("User not found or address not set");

        return Ok(new { userId = id, address });
    }

    // Cập nhật địa chỉ
    [HttpPost("{id:guid}/address")]
    public async Task<IActionResult> UpdateUserAddress(
        Guid id,
        [FromBody] string address)
    {
        await _service.UpdateUserAddressAsync(id, address);
        return Ok(new { message = "Address updated successfully" });
    }

    // Lấy user theo role
    [HttpGet("by-role/{role}")]
    public async Task<IActionResult> GetUsersByRole(string role)
    {
        var users = await _service.GetUsersByRoleAsync(role);
        return Ok(users);
    }

    // Lấy user theo status
    [HttpGet("by-status/{status}")]
    public async Task<IActionResult> GetUsersByStatus(string status)
    {
        var users = await _service.GetUsersByStatusAsync(status);
        return Ok(users);
    }

    // Lấy user theo role + status
    [HttpGet]
    public async Task<IActionResult> GetUsersByStatusAndRole(
        [FromQuery] string status,
        [FromQuery] string role)
    {
        var users = await _service.GetUsersByStatusAndRoleAsync(status, role);
        return Ok(users);
    }
}
