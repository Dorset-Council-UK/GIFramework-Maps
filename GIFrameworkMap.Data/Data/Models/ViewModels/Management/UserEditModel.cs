using GIFrameworkMaps.Data.Models.Authorization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
    public class UserEditModel
    {
        public Microsoft.Graph.Beta.Models.User User { get; set; }
        public List<int> SelectedRoles { get; set; }
        public List<ApplicationRole> AvailableRoles { get; set; }

        public List<int> SelectedVersions { get; set; }
        public List<Version> AvailableVersions { get; set; }
    }
}
