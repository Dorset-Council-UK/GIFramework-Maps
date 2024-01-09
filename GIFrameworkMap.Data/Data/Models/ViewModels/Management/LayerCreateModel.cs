using Microsoft.AspNetCore.Mvc.Rendering;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
	public class LayerCreateModel
    {
        public GIFrameworkMaps.Data.Models.Layer? Layer { get; set; }
        public SelectList? AvailableBounds { get; set; }
    }
}
