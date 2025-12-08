using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using Sos.Domain.Entities;
using System.Collections.Generic;
using System.Reflection.Emit;

namespace Sos.Infrastructure.Persistence
{
    public class SosDbContext : DbContext
    {
        public SosDbContext(DbContextOptions<SosDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<SOSReport> SOSReports => Set<SOSReport>();
        public DbSet<RescueTask> RescueTasks => Set<RescueTask>();
        public DbSet<SafetyPoint> SafetyPoints => Set<SafetyPoint>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // users
            modelBuilder.Entity<User>(b =>
            {
                b.ToTable("Users");
                b.HasKey(x => x.Id);
                b.HasIndex(x => x.Phone).IsUnique();
            });

            // sos_reports
            modelBuilder.Entity<SOSReport>(b =>
            {
                b.ToTable("SOSReports");
                b.HasKey(x => x.Id);
                b.HasIndex(x => x.Status);
            });

            modelBuilder.Entity<RescueTask>(b =>
            {
                b.ToTable("RescueTasks");
                b.HasKey(x => x.Id);
                b.HasIndex(x => x.ReportId).IsUnique();
            });

            modelBuilder.Entity<SafetyPoint>(b =>
            {
                b.ToTable("SafetyPoints");
                b.HasKey(x => x.Id);
            });
        }
    }
}
