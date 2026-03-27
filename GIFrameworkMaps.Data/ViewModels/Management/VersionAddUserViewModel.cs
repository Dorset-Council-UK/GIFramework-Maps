using Microsoft.Graph.Beta.Models;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
    public class VersionAddUserViewModel
    {
        public int VersionId { get; set; }
        public string VersionName { get; set; } = string.Empty;
        [Required]
        public string? UserId { get; set; }
        public IList<User>? ListOfUsers { get; set; } = [];
    }
}
