using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{

    public class LayerSourceType
    {
        public int Id { get; set; }
        [MaxLength(100)]
        public string? Name { get; set; }
        public string? Description { get; set; }
    }
}
