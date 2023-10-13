using Microsoft.Graph.Beta.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models.ViewModels.Management
{
    public class VersionAddContactModel
    {
        public VersionContact ContactEntry { get; set; }
        public UserCollectionResponse ListOfUsers { get; set; }
    }
}
