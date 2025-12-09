// Program.cs
using Microsoft.EntityFrameworkCore;
using Sos.Application.Services;
using Sos.Domain.Interfaces;
using Sos.Infrastructure.Persistence;
using Sos.Infrastructure.Repositories;
using Sos.WebApi.Hubs;
using SOS.Domain.Interfaces;
using StackExchange.Redis;
using Microsoft.AspNetCore.SignalR;

var builder = WebApplication.CreateBuilder(args);

// 1. Database
var conn = @"Server=VUANHQUAN\SQLEXPRESS01;Database=SOSMap;Trusted_Connection=True;TrustServerCertificate=True;Encrypt=False;";
builder.Services.AddDbContext<SosDbContext>(opts =>
    opts.UseSqlServer(conn, x => x.UseNetTopologySuite()));

// 2. Repositories
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IReportRepository, ReportRepository>();
builder.Services.AddScoped<IRescueTaskRepository, RescueTaskRepository>();
builder.Services.AddScoped<ISafetyPointRepository, SafetyPointRepository>();
builder.Services.AddScoped<AdminService>();


// 3. Services
builder.Services.AddScoped<ReportService>();

var redisConn = builder.Configuration.GetValue<string>("Redis") ?? "localhost:6379";

builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    // Đảm bảo Redis server đang chạy
    var configuration = ConfigurationOptions.Parse(redisConn);
    configuration.AbortOnConnectFail = false;
    return ConnectionMultiplexer.Connect(configuration);
});

builder.Services.AddSingleton<OtpService>();
// 4. Notification Service (duy nhất đang dùng trong TestHub)
builder.Services.AddScoped<INotificationService, SignalRNotificationService>();

// 5. SignalR
// Update the SignalR configuration to resolve the error
builder.Services.AddSignalR()
    .AddStackExchangeRedis(redisConn, options =>
    {
        options.Configuration.ChannelPrefix = new RedisChannel("SOS_SignalR:", RedisChannel.PatternMode.Literal);
    });

// 6. CORS (cho Live Server port 5500)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("http://localhost:5500", "http://127.0.0.1:5500")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 7. Controllers + Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Middleware
app.UseSwagger();
app.UseSwaggerUI();
app.UseRouting();
app.UseCors("AllowAll");  // Phải đứng trước MapHub
app.UseAuthorization();

app.MapControllers();
app.MapHub<TestHub>("/testhub");

// Áp dụng migration
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SosDbContext>();
    db.Database.Migrate();
}


app.Run();