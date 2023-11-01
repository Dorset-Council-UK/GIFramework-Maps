using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models.ViewModels
{
    public class ApplicationUserRoleViewModel
    {
        public string? UserId { get; } 
        public int RoleId { get; }
        public string? RoleName { get; }
    }
}
