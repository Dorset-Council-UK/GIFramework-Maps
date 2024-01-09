using System.Collections.Generic;

namespace GIFrameworkMaps.Data
{
	public interface ISearchRepository
    {
        List<Models.VersionSearchDefinition> GetSearchDefinitionsByVersion(int versionId);
        Models.Search.SearchResults Search(string searchTerm, List<Models.Search.RequiredSearch> requiredSearchesList);
    }
}
