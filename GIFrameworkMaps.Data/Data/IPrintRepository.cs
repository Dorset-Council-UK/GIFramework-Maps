using GIFrameworkMaps.Data.Models;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data
{
	public interface IPrintRepository
    {
        Task<VersionPrintConfiguration> GetPrintConfigurationByVersion(int versionId);
    }
}
