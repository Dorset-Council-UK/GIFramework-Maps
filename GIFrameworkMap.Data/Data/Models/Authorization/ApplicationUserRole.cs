using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models.Authorization
{
    public class ApplicationUserRole
    {
        [Required]
        public required string UserId { get; set; }
        [Required]
        public int ApplicationRoleId { get; set; }
        public virtual ApplicationRole? Role { get; set; }
    }
}
