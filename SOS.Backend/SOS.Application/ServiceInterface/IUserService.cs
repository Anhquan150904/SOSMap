using Sos.Application.DTOs.UserDto;
using Sos.Domain.Entities;

namespace Sos.Application.Service.Interfaces
{
    public interface IUserService
    {
        Task<string?> GetUserAddressAsync(Guid userId);

        Task<User?> GetUsersIDAsync(Guid id);

        Task UpdateUserAddressAsync(Guid userId, string address);

        Task<IEnumerable<UserDto>> GetUsersByRoleAsync(string role);

        Task<IEnumerable<UserDto>> GetUsersByStatusAsync(string status);

        Task<IEnumerable<UserDto>> GetUsersByStatusAndRoleAsync(string status, string role);
    }
}
