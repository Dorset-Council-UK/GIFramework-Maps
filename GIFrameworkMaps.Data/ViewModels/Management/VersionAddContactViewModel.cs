using GIFrameworkMaps.Data.Models;
using Microsoft.Graph.Models;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class VersionAddContactViewModel
	{
		public VersionContact? ContactEntry { get; set; }
		public IList<User>? ListOfUsers { get; set; } = [];
	}
}
