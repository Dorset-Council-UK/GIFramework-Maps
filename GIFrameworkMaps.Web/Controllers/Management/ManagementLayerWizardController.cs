using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models.ViewModels.Management;
using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Graph.Beta.Models;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
    public class ManagementLayerWizardController : Controller
    {
        private readonly ILogger<ManagementLayerWizardController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ICommonRepository _commonRepository;
        private readonly ApplicationDbContext _context;
        public ManagementLayerWizardController(
            ILogger<ManagementLayerWizardController> logger,
            IManagementRepository repository,
            ICommonRepository commonRepository,
            ApplicationDbContext context
            )
        {
            _logger = logger;
            _repository = repository;
            _commonRepository = commonRepository;
            _context = context;
        }
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult SelectWebService() {
            //get list of services
            var definitions = _commonRepository.GetWebLayerServiceDefinitions();
            return View(definitions);
        }

        [HttpPost]
        public IActionResult CreateSource(string layerDetails) {

            LayerResource layerResource = JsonSerializer.Deserialize<LayerResource>(layerDetails);

            var layerSource = new LayerSource
            {
                Name = layerResource.Name,
                Description = layerResource.Abstract
            };
            var editModel = new LayerWizardCreateSourceViewModel {
                BaseURL = layerResource.BaseUrl,
                Format = layerResource.Formats[0],
                EPSG = layerResource.Projection,
                LayerName = layerResource.Name,
                LayerSource = layerSource,
            };
            RebuildLayerWizardCreateSourceViewModel(ref editModel, layerSource);
            return View(editModel);
        }

        public async Task<IActionResult> CreateSourcePost(LayerWizardCreateSourceViewModel model) {
            if (ModelState.IsValid)
            {
                try
                {

                    var urlOpt = new LayerSourceOption { Name = "url", Value = model.BaseURL };
                    var paramsOpt = new LayerSourceOption
                    {
                        Name = "params",
                        Value =
                        @$"{{
                                ""LAYERS"":""{model.LayerName}"", 
                                ""FORMAT"":""{model.Format}"",
                                ""CRS"": ""{model.EPSG}""
                            }}"
                    };
                    model.LayerSource.LayerSourceOptions.Add(urlOpt);
                    model.LayerSource.LayerSourceOptions.Add(paramsOpt);
                    if(model.EPSG != "EPSG:3857")
                    {
                        model.LayerSource.LayerSourceOptions.Add(new LayerSourceOption { Name = "projection", Value = model.EPSG });
                    }
                    _context.Add(model.LayerSource);
                    await _context.SaveChangesAsync();

                    return RedirectToAction("CreateFromSource", "ManagementLayer", new {id=model.LayerSource.Id});

                }
                catch (DbUpdateException ex)
                {
                    _logger.LogError(ex, "Layer source creation failed");
                    ModelState.AddModelError("", "Unable to save changes. " +
                        "Try again, and if the problem persists, " +
                        "contact your system administrator.");
                }
            }
            RebuildLayerWizardCreateSourceViewModel(ref model, model.LayerSource);
            return View("CreateSource", model);
        }

        private void RebuildLayerWizardCreateSourceViewModel(ref Data.Models.ViewModels.Management.LayerWizardCreateSourceViewModel model, Data.Models.LayerSource layerSource)
        {
            var attributions = _context.Attribution.OrderBy(t => t.Name).ToList();
            var layerSourceTypes = _context.LayerSourceType.OrderBy(t => t.Name).ToList();

            model.AvailableAttributions = new SelectList(attributions, "Id", "Name", layerSource.AttributionId);
            model.AvailableLayerSourceTypes = new SelectList(layerSourceTypes, "Id", "Name", layerSource.LayerSourceTypeId);
        }

        //public IActionResult CreateFromTMS()
        //{

        //}
    }
}
