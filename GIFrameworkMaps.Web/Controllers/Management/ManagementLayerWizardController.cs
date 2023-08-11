using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace GIFrameworkMaps.Web.Controllers.Management
{
    public class ManagementLayerWizardController : Controller
    {
        private readonly ILogger<ManagementLayerWizardController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        public ManagementLayerWizardController(
            ILogger<ManagementLayerWizardController> logger,
            IManagementRepository repository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
        }
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult SelectWebService() {
            //get list of services

            return View();
        }

        //public IActionResult CreateFromWebService(string url) {
        
        //}

        //public IActionResult CreateFromTMS()
        //{

        //}
    }
}
