using AutoMapper;
using BenchmarkDotNet.Attributes;
using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BenchmarkTests
{
	public abstract class BenchmarkBase
	{
		private ApplicationDbContext _context;
		protected ICommonRepository _commonRepository;

		[GlobalSetup]
		public void Setup()
		{
			// Create repository dependencies

			var configuration = new ConfigurationBuilder()
				.AddUserSecrets<GetVersionsBenchmarks>()
				.Build();
			var connectionString = configuration.GetConnectionString("GIFrameworkMaps");
			var options = new DbContextOptionsBuilder<ApplicationDbContext>()
				.UseNpgsql(connectionString, x => x.UseNodaTime())
				.EnableSensitiveDataLogging(false)
				.Options;

			var logger = new LoggerFactory().CreateLogger<CommonRepository>();
			var poolingFactory = new PooledDbContextFactory<ApplicationDbContext>(options);
			var memoryCache = new MemoryCache(new MemoryCacheOptions());
			var mapper = new Mapper(new MapperConfiguration(cfg => cfg.AddMaps(typeof(ApplicationDbContext).Assembly)));
			var httpContextAccessor = new HttpContextAccessor();

			// Pass the dependencies to the CommonRepository constructor
			_context = poolingFactory.CreateDbContext();
			_commonRepository = new CommonRepository(logger, _context, memoryCache, mapper, httpContextAccessor);
		}

		[GlobalCleanup]
		public ValueTask Cleanup() => _context.DisposeAsync();
	}
}
