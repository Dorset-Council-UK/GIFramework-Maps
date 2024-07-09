using Microsoft.AspNetCore.Mvc.Rendering;
using System.Collections.Generic;

namespace GIFrameworkMaps.Data.ViewModels.Management
{
	public class UserEditViewModel
	{
		protected readonly string _nameSlugSeparator = "__";

		public Microsoft.Graph.Beta.Models.User? User { get; set; }
		public IList<int> SelectedRoles { get; set; } = [];
		public IList<int> SelectedVersions { get; set; } = [];
		public IList<SelectListItem> AvailableRoles { get; set; } = [];
		public IList<SelectListItem> AvailableVersions { get; set; } = [];

		public string CombineNameAndSlug(string name, string slug)
		{
			return $"{name}{_nameSlugSeparator}{slug}";
		}

		public (string Name, string Slug) SplitNameAndSlug(SelectListItem item)
		{
			var parts = item.Text.Split(_nameSlugSeparator);
			return (parts[0], parts[1]);
		}
	}
}
