using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.Graph.Beta.Models;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class VersionEditViewModel
	{
		public Version? Version { get; set; }
		public SelectList? AvailableThemes { get; set; }
		public SelectList? AvailableBounds { get; set; }
		public SelectList? AvailableTours { get; set; }
		public SelectList? AvailableWelcomeMessages { get; set; }
		public SelectList? AvailableAttributions { get; set; }

		public IList<int> SelectedBasemaps { get; set; } = [];
		[Display(Name = "Default basemap")]
		public int DefaultBasemap { get; set; }
		public IList<Basemap> AvailableBasemaps { get; set; } = [];

		public IList<Projection> AvailableProjections { get; set; } = [];
		[Display(Name = "Map Projection")]
		public int MapProjection { get; set; }
		[Display(Name = "Projection shown to users")]
		public int ViewProjection { get; set; }
		public IList<int> SelectedProjections { get; set; } = [];
		public IList<int> SelectedCategories { get; set; } = [];
		public IList<Category> AvailableCategories { get; set; } = [];

		[Display(Name = "Purge memory cache on save?")]
		public bool PurgeCache { get; set; }
	}
}
