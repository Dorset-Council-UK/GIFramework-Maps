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
		public void Select()
		{
			var themes = _context.Themes
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name)
				.ToList();

			var bounds = _context.Bounds
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name)
				.ToList();

			var welcomeMessages = _context.WelcomeMessages
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name)
				.ToList();

			var tours = _context.TourDetails
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name)
				.ToList();

			var availableThemes = new SelectList(themes, "Id", "Name", version.ThemeId);
			var availableBounds = new SelectList(bounds, "Id", "Name", version.BoundId);
			var availableWelcomeMessages = new SelectList(welcomeMessages, "Id", "Name", version.WelcomeMessageId);
			var availableTours = new SelectList(tours, "Id", "Name", version.TourDetailsId);
		}

		[Benchmark]
		public async Task SelectAsync()
		{
			var themes = await _context.Themes
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name)
				.ToListAsync();

			var bounds = await _context.Bounds
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name)
				.ToListAsync();

			var welcomeMessages = await _context.WelcomeMessages
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name)
				.ToListAsync();

			var tours = await _context.TourDetails
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name)
				.ToListAsync();

			var availableThemes = new SelectList(themes, "Id", "Name", version.ThemeId);
			var availableBounds = new SelectList(bounds, "Id", "Name", version.BoundId);
			var availableWelcomeMessages = new SelectList(welcomeMessages, "Id", "Name", version.WelcomeMessageId);
			var availableTours = new SelectList(tours, "Id", "Name", version.TourDetailsId);
		}

		[Benchmark]
		public void SelectQueryable()
		{
			var themes = _context.Themes
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name);

			var bounds = _context.Bounds
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name);

			var welcomeMessages = _context.WelcomeMessages
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name);

			var tours = _context.TourDetails
				.Select(o => new { o.Id, o.Name })
				.OrderBy(o => o.Name);

			var availableThemes = new SelectList(themes, "Id", "Name", version.ThemeId);
			var availableBounds = new SelectList(bounds, "Id", "Name", version.BoundId);
			var availableWelcomeMessages = new SelectList(welcomeMessages, "Id", "Name", version.WelcomeMessageId);
			var availableTours = new SelectList(tours, "Id", "Name", version.TourDetailsId);
		}
	}
}
