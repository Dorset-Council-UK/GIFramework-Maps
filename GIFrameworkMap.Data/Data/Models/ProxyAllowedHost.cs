using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class ProxyAllowedHost
    {
        public int Id { get; set; }
        [Required]
        public string Host { get; set; }
    }
}
