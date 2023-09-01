using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models.ViewModels.Management;
using GIFrameworkMaps.Data.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.Extensions.Logging;
using System.Linq;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using FuzzySharp;
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
        public IActionResult CreateSource(string layerDetails, string projection, string format) {

            LayerResource layerResource = JsonSerializer.Deserialize<LayerResource>(layerDetails);

            var layerSource = new LayerSource
            {
                Name = layerResource.Name,
                Description = layerResource.Abstract
            };
            if (!string.IsNullOrEmpty(layerResource.Attribution))
            {
                //attempt to get most relevant attribution
                var attributions = _context.Attribution.ToList();
                var closestMatch = Process.ExtractOne(layerResource.Attribution, attributions.Select(a => a.RenderedAttributionHTML), cutoff: 70);
                if (closestMatch != null)
                {
                    layerSource.Attribution = attributions[closestMatch.Index];
                    layerSource.AttributionId = attributions[closestMatch.Index].Id;
                }

            }
            var editModel = new LayerWizardCreateSourceViewModel {
                BaseURL = layerResource.BaseUrl,
                Format = format,
                Projection = projection,
                LayerName = layerResource.Name,
                Version = layerResource.Version,
                UseProxy = layerResource.ProxyMetaRequests,
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
                                ""CRS"": ""{model.Projection}"",
                                ""VERSION"": ""{model.Version}""
                            }}"
                    };
                    model.LayerSource.LayerSourceOptions.Add(urlOpt);
                    model.LayerSource.LayerSourceOptions.Add(paramsOpt);
                    if(model.Projection != "EPSG:3857")
                    {
                        model.LayerSource.LayerSourceOptions.Add(new LayerSourceOption { Name = "projection", Value = model.Projection });
                    }
                    _context.Add(model.LayerSource);
                    await _context.SaveChangesAsync();

                    return RedirectToAction("CreateFromSource", "ManagementLayer", new {id=model.LayerSource.Id, useProxy = model.UseProxy});

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
            var layerSourceTypes = _context.LayerSourceType.Where(l => l.Name.Contains("WMS")).OrderBy(t => t.Id).ToList();
            model.AvailableAttributions = new SelectList(attributions, "Id", "Name", layerSource.AttributionId);
            model.AvailableLayerSourceTypes = new SelectList(layerSourceTypes, "Id", "Name", layerSource.LayerSourceTypeId);
        }

        //public IActionResult CreateFromTMS()
        //{

        //}
    }
}
