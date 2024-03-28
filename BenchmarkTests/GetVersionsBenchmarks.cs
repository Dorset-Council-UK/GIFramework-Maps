using BenchmarkDotNet.Attributes;

namespace BenchmarkTests
{
	[MemoryDiagnoser]
	[Config(typeof(BenchmarkConfig))]
	public class GetVersionsBenchmarks : BenchmarkBase
	{
		[Benchmark(Baseline = true)]
		public List<GIFrameworkMaps.Data.Models.Version> Original()
		{
			return _commonRepository.GetVersionsOriginal();
		}

		[Benchmark]
		public async Task<List<GIFrameworkMaps.Data.Models.Version>> GetVersions()
		{
			return await _commonRepository.GetVersions();
		}
	}
}
