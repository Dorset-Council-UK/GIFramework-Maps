using GIFrameworkMaps.Data.Models.Authorization;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
	public class UserEditModel
    {
        public Microsoft.Graph.Beta.Models.User? User { get; set; }
        public List<int> SelectedRoles { get; set; } = new();
        public List<ApplicationRole> AvailableRoles { get; set; } = new();

        public List<int> SelectedVersions { get; set; } = new();
        public List<Version> AvailableVersions { get; set; } = new();
    }
}
