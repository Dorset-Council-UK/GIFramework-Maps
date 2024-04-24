using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers
{
  public class PrintController(IPrintRepository repository) : Controller
    {
		[ResponseCache(Duration = 300, VaryByQueryKeys = ["id"])]
        public async Task<JsonResult> Configuration(int id)
        {
			var printConfiguration = await repository.GetPrintConfigurationByVersion(id);
            return Json(printConfiguration.PrintConfiguration);
        }
    }
}
