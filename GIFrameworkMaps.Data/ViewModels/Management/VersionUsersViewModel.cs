using System.Collections.Generic;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class VersionUsersViewModel
	{
		public int VersionId { get; set; }
		public required Models.Version Version { get; set; }
		public required IList<Microsoft.Graph.Models.User> Users { get; set; }
	}
}
