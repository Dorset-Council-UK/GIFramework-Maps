using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Mvc;

namespace GIFrameworkMaps.Web.Controllers
{
  public class PrintController : Controller
    {
        //dependancy injection
        private readonly IPrintRepository _repository;
        public PrintController(IPrintRepository repository)
        {
            _repository = repository;
        }

        [ResponseCache(Duration = 300, VaryByQueryKeys = new string[] { "id" })]
        public JsonResult Configuration(int id)
        {
            var printConfiguration = _repository.GetPrintConfigurationByVersion(id).PrintConfiguration;
            return Json(printConfiguration);
        }
    }
}
