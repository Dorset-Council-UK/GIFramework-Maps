using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class LayerSourceOption
    {
        public int Id { get; set; }
        [MaxLength(100)]
        public string Name { get; set; }
        public string Value { get; set; }
        public int LayerSourceId { get; set; }
    }
}
