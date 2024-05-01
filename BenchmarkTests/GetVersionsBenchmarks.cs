using BenchmarkDotNet.Attributes;
using Microsoft.EntityFrameworkCore;

namespace BenchmarkTests
{
	[MemoryDiagnoser]
	[Config(typeof(BenchmarkConfig))]
	public class GetVersionsBenchmarks : BenchmarkBase
	{
		[Benchmark(Baseline = true)]
		public List<GIFrameworkMaps.Data.Models.Version> Original()
		{
			var versions = _context.Versions
				.IgnoreAutoIncludes()
				.AsNoTrackingWithIdentityResolution()
				.ToList();
			return versions;
		}

		[Benchmark]
		public async Task<List<GIFrameworkMaps.Data.Models.Version>> GetVersions()
		{
			return await _commonRepository.GetVersions();
		}
	}
}
