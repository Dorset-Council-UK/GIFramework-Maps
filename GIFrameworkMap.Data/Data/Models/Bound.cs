using System.ComponentModel.DataAnnotations;

namespace GIFrameworkMaps.Data.Models
{
    public class Bound
    {
        public int Id { get; set; }
        [MaxLength(100)]
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal BottomLeftX { get; set; }
        public decimal BottomLeftY { get; set; }
        public decimal TopRightX { get; set; }
        public decimal TopRightY { get; set; }

    }
}
