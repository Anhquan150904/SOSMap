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
    // Api Lấy địa chỉ người dùng theo ID truyền vào
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
    // Api cập nhật địa chỉ người dùng theo ID truyền vào

    [HttpPost("{id}/address")]
    public async Task<IActionResult> UpdateUserAddress(Guid id, string address)
    {
        await _userRepo.UpdateLocationAsync(id, address);
        return Ok(new { message = "Address updated successfully" });
    }
    
    // Api lấy danh sách người dùng theo role
    [HttpGet("{role}/get-user-by-role")]
    public async Task<IActionResult> GetUsersByRole(string role)
    {
        var users = await _userRepo.GetUsersByRoleAsync(role);
        return Ok(users);
    }

    //Api lấy danh sách người dùng theo trạng thái
    [HttpGet("{status}/get-user-by-status")]
    public async Task<IActionResult> GetUsersByStatus(string status)
    {
        var users = await _userRepo.GetUserByStatusAsync(status);
        return Ok(users);
    }

    //Api lấy danh sách người dùng theo trạng thái và status
    // GET: /api/users?status=active&role=volunteer
    [HttpGet("get-user-by-role-and-status")]
    public async Task<IActionResult> GetUsersByStatusAndRole(
        [FromQuery] string status,
        [FromQuery] string role)
    {
        var users = await _userRepo.GetUserByStatusAndRoleAsync(status, role);
        return Ok(users);
    }

}