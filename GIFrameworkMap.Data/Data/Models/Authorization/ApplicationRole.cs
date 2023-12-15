using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models.Authorization
{
    public class ApplicationRole
    {
        public int Id { get; set; }
        [MaxLength(200)]
        [Required]
        public string? RoleName { get; set; }
    }
}
