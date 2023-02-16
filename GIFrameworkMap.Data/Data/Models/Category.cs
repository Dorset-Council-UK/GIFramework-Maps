using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class Category
    {
        public int Id { get; set; }
        [MaxLength(200)]
        public string Name { get; set; }
        public string Description { get; set; }
        public int Order { get; set; }
        public int? ParentCategoryId { get; set; }
        public virtual List<CategoryLayer> Layers { get; set; }
        public Category ParentCategory { get; set; }
    }
}
