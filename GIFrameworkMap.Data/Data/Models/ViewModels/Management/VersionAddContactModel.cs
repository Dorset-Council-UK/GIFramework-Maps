using Microsoft.Graph.Beta.Models;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
	public class VersionAddContactModel
    {
        public VersionContact? ContactEntry { get; set; }
        public List<User>? ListOfUsers { get; set; }
    }
}
