using BenchmarkDotNet.Attributes;

namespace BenchmarkTests
{
	[MemoryDiagnoser]
	[Config(typeof(BenchmarkConfig))]
	public class GetVersionBenchmarks : BenchmarkBase
	{
		private static readonly int versionId = 8;

		[Benchmark(Baseline = true)]
		public GIFrameworkMaps.Data.Models.Version? Original()
		{
			return _commonRepository.GetVersionOriginal(versionId);
		}

		[Benchmark]
		public async Task<GIFrameworkMaps.Data.Models.Version?> Version()
		{
			return await _commonRepository.GetVersion(versionId);
		}
	}
}
