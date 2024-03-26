using System.Collections.Generic;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Tour;

namespace GIFrameworkMaps.Data.ViewModels
{
	public class VersionViewModel
	{
		public int Id { get; set; }
		public string? Name { get; set; }
		public string? Description { get; set; }
		public string? Slug { get; set; }
		public List<CategoryViewModel> Categories { get; set; } = [];
		public List<BasemapViewModel> Basemaps { get; set; } = [];
		public string? HelpURL { get; set; }
		public string? FeedbackURL { get; set; }
		public bool ShowLogin { get; set; }
		public Theme? Theme { get; set; }
		public Bound? Bound { get; set; }
		public WelcomeMessage? WelcomeMessage { get; set; }
		public TourDetail? TourDetails { get; set; }
		public List<ProjectionViewModel> AvailableProjections { get; set; } = [];
		public string? AppRoot { get; set; }
		public string? GoogleMapsAPIKey { get; set; }
		public bool IsLoggedIn { get; set; }
	}
}
