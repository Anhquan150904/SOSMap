using Sos.Application.DTOs.UserDto;
using Sos.Application.Service.Interfaces;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;

namespace Sos.Application.Services
{
    public class UserService: IUserService
    {
        private readonly IUserRepository _userRepo;

        public UserService(IUserRepository userRepo)
        {
            _userRepo = userRepo;
        }

        public async Task<string?> GetUserAddressAsync(Guid userId)
        {
            return await _userRepo.GetAdressByIdAsync(userId);
        }

        public async Task UpdateUserAddressAsync(Guid userId, string address)
        {
            if (string.IsNullOrWhiteSpace(address))
                throw new ArgumentException("Address is required");

            await _userRepo.UpdateLocationAsync(userId, address);
        }

        public async Task<IEnumerable<UserDto>> GetUsersByRoleAsync(string role)
        {
            var users = await _userRepo.GetUsersByRoleAsync(role);
            return users.Select(Map);
        }

        public async Task<IEnumerable<UserDto>> GetUsersByStatusAsync(string status)
        {
            var users = await _userRepo.GetUserByStatusAsync(status);
            return users.Select(Map);
        }

        public async Task<IEnumerable<UserDto>> GetUsersByStatusAndRoleAsync(string status, string role)
        {
            var users = await _userRepo.GetUserByStatusAndRoleAsync(status, role);
            return users.Select(Map);
        }
        public async Task<User?> GetUsersIDAsync(Guid id)
        {
            var users = await _userRepo.GetByIdAsync(id);
            return users;
        }

        private static UserDto Map(Sos.Domain.Entities.User u)
        {
            return new UserDto
            {
                Id = u.Id,
                Phone = u.Phone,
                FullName = u.FullName,
                Role = u.Role,
                Status = u.Status,
                Address = u.Address
            };
        }
    }
}
