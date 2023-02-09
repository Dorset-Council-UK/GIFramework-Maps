using GIFrameworkMaps.Data.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data
{
    public interface IManagementRepository
    {
        bool PurgeCache();
        Task<Attribution> GetAttribution(int id);
        Task<List<Attribution>> GetAttributions();
        Task<Bound> GetBound(int id);
        Task<List<Bound>> GetBounds();
        Task<Theme> GetTheme(int id);
        Task<List<Theme>> GetThemes();
    }
}
