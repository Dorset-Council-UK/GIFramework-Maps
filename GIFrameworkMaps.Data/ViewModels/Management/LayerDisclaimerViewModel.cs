using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class LayerDisclaimerViewModel
	{
		public LayerDisclaimer LayerDisclaimer { get; set; } = default!;

		public IList<Layer> LayersUsingDisclaimer { get; set; } = [];
	}
}
