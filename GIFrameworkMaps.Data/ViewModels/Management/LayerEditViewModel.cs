using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class LayerEditViewModel
	{
		public Layer? Layer { get; set; }
		public SelectList? AvailableBounds { get; set; }
		public SelectList? AvailableDisclaimers { get; set; }
		public IList<int> SelectedCategories { get; set; } = [];
		public IList<Category> AvailableCategories { get; set; } = [];
		public IList<Version> VersionsLayerAppearsIn { get; set; } = [];
	}
}
