using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class AnalyticsEditViewModel
	{
		public AnalyticsDefinition? AnalyticDefinition { get; set; }
		public SelectList? AvailableProducts { get; set; }
		public SelectList? AvailableCookieControl { get; set; }

		public IList<int> SelectedVersions { get; set; } = [];
		public IList<Version> AvailableVersions { get; set; } = [];
	}
}
