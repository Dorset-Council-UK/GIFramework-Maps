using System.Collections.Generic;

namespace GIFrameworkMaps.Data.Models.ViewModels
{
	public class CategoryViewModel
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? Description { get; set; }
        public int Order { get; set; }
        public List<LayerViewModel> Layers { get; set; } = new();
        public CategoryViewModel? ParentCategory { get; set; }
    }
}
