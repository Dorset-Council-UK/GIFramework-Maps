using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;

namespace BenchmarkTests
{
	[MemoryDiagnoser]
	[Config(typeof(BenchmarkConfig))]
	public class ManagementUserControllerBenchmarks : BenchmarkBase
	{
		private static readonly string userId = "123";

		[Benchmark(Baseline = true)]
		public void Original()
		{
			var versions = _context.Versions.Where(v => v.RequireLogin == true).OrderBy(v => v.Name).ToList();
			var roles = _context.ApplicationRoles.OrderBy(r => r.RoleName).ToList();
			var selectedVersions = _context.VersionUsers.Where(vu => vu.UserId == userId).Select(vu => vu.VersionId).ToList();
			var selectedRoles = _context.ApplicationUserRoles.Where(aur => aur.UserId == userId).Select(aur => aur.ApplicationRoleId).ToList();
		}

		[Benchmark]
		public async Task RebuildViewModel()
		{
			var versions = await _context.Versions
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.Where(o => o.RequireLogin == true)
				.OrderBy(o => o.Name)
				.ToListAsync();

			var roles = await _context.ApplicationRoles
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.OrderBy(o => o.RoleName)
				.ToListAsync();

			var selectedVersions = await _context.VersionUsers
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.Where(o => o.UserId == userId)
				.Select(o => o.VersionId)
				.ToListAsync();

			var selectedRoles = await _context.ApplicationUserRoles
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.Where(o => o.UserId == userId)
				.Select(o => o.ApplicationRoleId)
				.ToListAsync();
		}
	}
}
