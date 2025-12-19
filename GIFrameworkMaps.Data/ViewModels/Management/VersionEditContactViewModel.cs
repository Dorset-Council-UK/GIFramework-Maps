using GIFrameworkMaps.Data.Models;
using Microsoft.Graph.Beta.Models;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class VersionEditContactViewModel
	{
		public int VersionId { get; set; }
		public string VersionName { get; set; } = string.Empty;
		public VersionContact[] Contacts { get; set; } = [];
	}
}
