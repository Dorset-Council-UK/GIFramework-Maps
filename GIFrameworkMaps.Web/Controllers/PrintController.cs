using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace GIFrameworkMaps.Web.Controllers
{
    public class PrintController : Controller
    {
        //dependancy injection
        private readonly IPrintRepository _repository;
        private readonly ILogger<PrintController> _logger;
        public PrintController(IPrintRepository repository, ILogger<PrintController> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        [ResponseCache(Duration = 300, VaryByQueryKeys = new string[] { "id" })]
        public JsonResult Configuration(int id)
        {
            var printConfiguration = _repository.GetPrintConfigurationByVersion(id).PrintConfiguration;
            return Json(printConfiguration);
        }
    }
}
