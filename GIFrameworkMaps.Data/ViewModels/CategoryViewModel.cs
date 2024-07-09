using System.Collections.Generic;

namespace GIFrameworkMaps.Data.ViewModels
{
	public class CategoryViewModel
	{
		public int Id { get; set; }
		public string? Name { get; set; }
		public string? Description { get; set; }
		public int Order { get; set; }
		public List<LayerViewModel> Layers { get; set; } = [];
		public CategoryViewModel? ParentCategory { get; set; }
	}
}
