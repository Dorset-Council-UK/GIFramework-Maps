using GIFrameworkMaps.Data.Models;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class CustomiseLayerEditViewModel
	{
		public required Version Version { get; set; }
		public required Layer Layer { get; set; }
		public required Category Category { get; set; }
		public VersionLayer? LayerCustomisation { get; set; }
	}
}
