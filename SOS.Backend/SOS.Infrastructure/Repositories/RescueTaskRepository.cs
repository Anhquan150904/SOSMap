using Microsoft.EntityFrameworkCore;
using Sos.Domain.Entities;
using Sos.Domain.Interfaces;
using Sos.Infrastructure.Persistence;

namespace Sos.Infrastructure.Repositories
{
    public class RescueTaskRepository : IRescueTaskRepository
    {
        private readonly SosDbContext _db;
        public RescueTaskRepository(SosDbContext db) { _db = db; }

        public async Task AddAsync(RescueTask task, CancellationToken ct = default)
        {
            await _db.RescueTasks.AddAsync(task, ct);
            await _db.SaveChangesAsync(ct);
        }

        public async Task<RescueTask?> GetByReportIdAsync(Guid reportId, CancellationToken ct = default)
        {
            return await _db.RescueTasks.FirstOrDefaultAsync(t => t.Id == reportId, ct);
        }

        public async Task<RescueTask?> GetByIdAsync(Guid id, CancellationToken ct = default)
        {
            return await _db.RescueTasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        }

        public async Task UpdateAsync(RescueTask task, CancellationToken ct = default)
        {
            _db.RescueTasks.Update(task);
            await _db.SaveChangesAsync(ct);
        }
    }
}
