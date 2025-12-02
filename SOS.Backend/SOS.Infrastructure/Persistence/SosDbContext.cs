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
                b.ToTable("users");
                b.HasKey(x => x.Id);
                b.HasIndex(x => x.Phone).IsUnique();
                b.Property(x => x.LastKnownLocation).HasColumnType("geography");
            });

            // sos_reports
            modelBuilder.Entity<SOSReport>(b =>
            {
                b.ToTable("sos_reports");
                b.HasKey(x => x.Id);

                // SQL Server: dùng geography
                b.Property(x => x.Location)
                    .HasColumnType("geography")
                    .IsRequired();

                b.HasIndex(x => x.Status);
            });

            modelBuilder.Entity<RescueTask>(b =>
            {
                b.ToTable("rescue_tasks");
                b.HasKey(x => x.Id);
                b.HasIndex(x => x.ReportId).IsUnique();
            });

            modelBuilder.Entity<SafetyPoint>(b =>
            {
                b.ToTable("safety_points");
                b.HasKey(x => x.Id);
                b.Property(x => x.Location).HasColumnType("geography").IsRequired();
            });
        }
    }
}
