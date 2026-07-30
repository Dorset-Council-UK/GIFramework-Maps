using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class CategoryEditViewModel
	{
		public Category? Category { get; set; }
		public SelectList? AvailableParentCategories { get; set; }

		public IList<int> SelectedLayers { get; set; } = [];

		public IList<SelectListItem> AvailableLayers { get; set; } = [];
		public IList<Version> VersionsCategoryAppearsIn { get; set; } = [];

		public Dictionary<int, int> LayerSortOrders { get; set; } = [];

		/// <summary>
		/// When true, all layers in this category use SortOrder 0 and sort alphabetically by default.
		/// </summary>
		public bool SortAlphabetically { get; set; } = true;
	}
}
