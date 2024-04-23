using BenchmarkDotNet.Attributes;
using Microsoft.EntityFrameworkCore;

namespace BenchmarkTests
{
	[MemoryDiagnoser]
	[Config(typeof(BenchmarkConfig))]
	public class GetFullUrlFromShortId : BenchmarkBase
	{
		private static readonly string shortId = "notThere";

		[Benchmark(Baseline = true)]
		public async Task<string> Original()
		{
			var shortLink = await _context.ShortLinks.AsNoTracking().FirstOrDefaultAsync(s => s.ShortId == shortId);
			if (shortLink == null || shortLink.FullUrl == null)
			{
				return "";
			}
			return shortLink.FullUrl;
		}

		[Benchmark]
		public async Task<string> Find()
		{
			var shortLink = await _context.ShortLinks.FindAsync(shortId);
			if (shortLink is null || shortLink.FullUrl is null)
			{
				return "";
			}
			return shortLink.FullUrl;
		}
	}
}
