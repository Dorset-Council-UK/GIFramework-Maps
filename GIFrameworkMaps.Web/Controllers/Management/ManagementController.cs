using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
	[Authorize(Roles = "GIFWAdmin")]
    public class ManagementController : Controller
    {
        //dependancy injection
        private readonly ICommonRepository _repository;
        private readonly IApplicationDbContext _context;

        public ManagementController(ICommonRepository repository, IApplicationDbContext context)
        {

            _repository = repository;
            _context = context;
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult RenderAttributionString(int id)
        {
            var attr = _context.Attributions.Where(a => a.Id == id).FirstOrDefault();
            if(attr != null)
            {
                return Content(attr.RenderedAttributionHTML);
            }
            return NotFound();
            
        }

        public async Task<IActionResult> BroadcastMessage()
        {
            var versions = await _repository.GetVersions();
            return View(versions);
        }
    }
}
