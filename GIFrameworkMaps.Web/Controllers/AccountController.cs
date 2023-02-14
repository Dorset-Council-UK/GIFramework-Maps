using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GIFrameworkMaps.Web.Controllers
{
    [Authorize]
    public class AccountController : Controller
    {
        private readonly ICommonRepository _commonRepository;
        public AccountController(ICommonRepository commonRepository) {
            _commonRepository = commonRepository;
        }
        public IActionResult Index()
        {
            return View();
        }
    }
}
