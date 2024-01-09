using System.ComponentModel;

namespace GIFrameworkMaps.Data.Models.Search
{
	public class LocalSearchDefinition : SearchDefinition
    {
        [DisplayName("Local search name")]
        public string? LocalSearchName { get; set; }
    }
}
