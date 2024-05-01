using BenchmarkDotNet.Attributes;
using Microsoft.EntityFrameworkCore;

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
			var version = _context.Versions
							.IgnoreAutoIncludes()
							.Include(v => v.Bound)
							.Include(v => v.Theme)
							.Include(v => v.WelcomeMessage)
							.Include(v => v.TourDetails)
								.ThenInclude(t => t!.Steps)
							.Include(v => v.VersionBasemaps)
								.ThenInclude(v => v.Basemap)
								.ThenInclude(l => l!.LayerSource)
								.ThenInclude(l => l!.LayerSourceOptions)
							.Include(v => v.VersionBasemaps)
								.ThenInclude(l => l.Basemap)
								.ThenInclude(l => l!.LayerSource)
								.ThenInclude(l => l!.LayerSourceType)
							.Include(v => v.VersionBasemaps)
								.ThenInclude(l => l.Basemap)
								.ThenInclude(l => l!.LayerSource)
								.ThenInclude(l => l!.Attribution)
							.Include(v => v.VersionBasemaps)
								.ThenInclude(l => l.Basemap)
								.ThenInclude(l => l!.Bound)
							.Include(v => v.VersionCategories)
								.ThenInclude(v => v.Category)
								.ThenInclude(c => c!.Layers)
								.ThenInclude(cl => cl.Layer)
								.ThenInclude(l => l!.LayerSource)
								.ThenInclude(ls => ls!.LayerSourceOptions)
							.Include(v => v.VersionCategories)
								.ThenInclude(v => v.Category)
								.ThenInclude(c => c!.Layers)
								.ThenInclude(cl => cl.Layer)
								.ThenInclude(l => l!.LayerSource)
								.ThenInclude(l => l!.LayerSourceType)
							.Include(v => v.VersionCategories)
								.ThenInclude(v => v.Category)
								.ThenInclude(c => c!.Layers)
								.ThenInclude(cl => cl.Layer)
								.ThenInclude(l => l!.LayerSource)
								.ThenInclude(l => l!.Attribution)
							.Include(v => v.VersionLayerCustomisations)
							.Include(v => v.VersionProjections)
								.ThenInclude(p => p.Projection)
							.AsSplitQuery()
							.AsNoTrackingWithIdentityResolution()
							.FirstOrDefault(v => v.Id == versionId);

			return version;
		}

		[Benchmark]
		public async Task<GIFrameworkMaps.Data.Models.Version?> Version()
		{
			return await _commonRepository.GetVersion(versionId);
		}
	}
}
