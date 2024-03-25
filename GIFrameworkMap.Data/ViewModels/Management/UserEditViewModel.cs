using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Authorization;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class UserEditViewModel
	{
		public Microsoft.Graph.Beta.Models.User? User { get; set; }
		public IList<int> SelectedRoles { get; set; } = [];
		public IList<ApplicationRole> AvailableRoles { get; set; } = [];

		public IList<int> SelectedVersions { get; set; } = [];
		public IList<Version> AvailableVersions { get; set; } = [];
	}
}
