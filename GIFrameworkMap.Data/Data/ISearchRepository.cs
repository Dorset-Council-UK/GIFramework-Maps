using System;
using System.Collections.Generic;
using System.Text;

namespace GIFrameworkMaps.Data
{
    public interface ISearchRepository
    {
        List<Models.VersionSearchDefinition> GetSearchDefinitionsByVersion(int versionId);
        Models.Search.SearchResults Search(string searchTerm, List<Models.Search.RequiredSearch> requiredSearchesList);
    }
}
