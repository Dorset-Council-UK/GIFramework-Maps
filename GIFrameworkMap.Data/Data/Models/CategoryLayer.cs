using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class CategoryLayer
    {
        public int LayerId { get; set; }
        public int CategoryId { get; set; }
        public int SortOrder { get; set; }

        public virtual Layer Layer { get; set; }
        public virtual Category Category { get; set; }
    }
}
