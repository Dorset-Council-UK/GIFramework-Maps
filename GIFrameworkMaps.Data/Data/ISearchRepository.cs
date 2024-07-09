using GIFrameworkMaps.Data.Models.Search;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data
{
	public interface ISearchRepository
    {
        Task<List<Models.VersionSearchDefinition>> GetSearchDefinitionsByVersion(int versionId);
        Task<SearchResults> Search(string searchTerm, List<RequiredSearch> requiredSearchesList);
	}
}
