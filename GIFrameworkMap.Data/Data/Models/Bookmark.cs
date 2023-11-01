using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data.Models
{
    public class Bookmark
    {
        public int Id { get; set;}
        [Required, MaxLength(50)]
        public string? Name { get; set; }
        [Required]
        public decimal X { get; set; }
        [Required]
        public decimal Y { get; set; }
        [Required, Range(0, 50)]
        public decimal Zoom { get; set; }
        [Required]
        public string? UserId { get; set; }
    }
}
