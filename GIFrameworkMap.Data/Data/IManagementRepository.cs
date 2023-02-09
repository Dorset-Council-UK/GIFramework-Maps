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
    }
}
