using BenchmarkDotNet.Attributes;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;

namespace BenchmarkTests
{
	[MemoryDiagnoser]
	[Config(typeof(BenchmarkConfig))]
	public class ManagementViewModelBenchmarks : BenchmarkBase
	{
		private static readonly GIFrameworkMaps.Data.Models.Version version = new();

		[Benchmark(Baseline = true)]
		public void Original()
		{
			var themes = _context.Themes.OrderBy(o => o.Name).ToList();
			var bounds = _context.Bounds.OrderBy(o => o.Name).ToList();
			var welcomeMessages = _context.WelcomeMessages.OrderBy(o => o.Name).ToList();
			var tours = _context.TourDetails.OrderBy(o => o.Name).ToList();

			var availableThemes = new SelectList(themes, "Id", "Name", version.ThemeId);
			var availableBounds = new SelectList(bounds, "Id", "Name", version.BoundId);
			var availableWelcomeMessages = new SelectList(welcomeMessages, "Id", "Name", version.WelcomeMessageId);
			var availableTours = new SelectList(tours, "Id", "Name", version.TourDetailsId);
		}

		[Benchmark]
		public async Task Async()
		{
			var themes = await _context.Themes.OrderBy(o => o.Name).ToListAsync();
			var bounds = await _context.Bounds.OrderBy(o => o.Name).ToListAsync();
			var welcomeMessages = await _context.WelcomeMessages.OrderBy(o => o.Name).ToListAsync();
			var tours = await _context.TourDetails.OrderBy(o => o.Name).ToListAsync();

			var availableThemes = new SelectList(themes, "Id", "Name", version.ThemeId);
			var availableBounds = new SelectList(bounds, "Id", "Name", version.BoundId);
			var availableWelcomeMessages = new SelectList(welcomeMessages, "Id", "Name", version.WelcomeMessageId);
			var availableTours = new SelectList(tours, "Id", "Name", version.TourDetailsId);
		}

		[Benchmark]
		public async Task AsyncProjection()
		{
			var themesProjection = _context.Themes.OrderBy(o => o.Name).Select(o => new { o.Id, o.Name }).ToListAsync();
			var boundsProjection = _context.Bounds.OrderBy(o => o.Name).Select(o => new { o.Id, o.Name }).ToListAsync();
			var welcomeMessagesProjection = _context.WelcomeMessages.OrderBy(o => o.Name).Select(o => new { o.Id, o.Name }).ToListAsync();
			var toursProjection = _context.TourDetails.OrderBy(o => o.Name).Select(o => new { o.Id, o.Name }).ToListAsync();

			var themes = await themesProjection;
			var bounds = await boundsProjection;
			var welcomeMessages = await welcomeMessagesProjection;
			var tours = await toursProjection;

			var availableThemes = new SelectList(themes, "Id", "Name", version.ThemeId);
			var availableBounds = new SelectList(bounds, "Id", "Name", version.BoundId);
			var availableWelcomeMessages = new SelectList(welcomeMessages, "Id", "Name", version.WelcomeMessageId);
			var availableTours = new SelectList(tours, "Id", "Name", version.TourDetailsId);
		}

	}
}
