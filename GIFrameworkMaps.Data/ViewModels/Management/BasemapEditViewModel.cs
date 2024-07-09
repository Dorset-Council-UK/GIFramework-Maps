using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class BasemapEditViewModel
	{
		public Basemap? Basemap { get; set; }
		public SelectList? AvailableBounds { get; set; }
	}
}
