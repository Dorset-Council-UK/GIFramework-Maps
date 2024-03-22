using GIFrameworkMaps.Data.Models;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class AnalyticsViewModel
	{
		public IList<AnalyticsDefinition> AvailableAnalytics { get; set; } = [];
		public int VersionID { get; set; }
	}
}
