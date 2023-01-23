using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class VersionCategory
    {
        public int VersionId { get; set; }
        public int CategoryId { get; set; }
        public Category Category { get; set; }
    }
}
