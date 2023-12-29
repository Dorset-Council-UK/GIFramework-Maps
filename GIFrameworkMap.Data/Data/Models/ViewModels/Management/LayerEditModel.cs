using Microsoft.AspNetCore.Mvc.Rendering;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
	public class LayerEditModel
    {
        public GIFrameworkMaps.Data.Models.Layer? Layer { get; set; }
        public SelectList? AvailableBounds { get; set; }
        public List<int> SelectedCategories { get; set; } = new();
        public List<Category> AvailableCategories { get; set; } = new();
    }
}
