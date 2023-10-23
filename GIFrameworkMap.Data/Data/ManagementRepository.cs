using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.ViewModels.Management;
using GIFrameworkMaps.Data.Models.Tour;
using GIFrameworkMaps.Data.Models.Search;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Graph.Beta;
using Azure.Identity;
using Microsoft.Extensions.Configuration;

namespace GIFrameworkMaps.Data
{
    public class ManagementRepository : IManagementRepository
    {
        //dependancy injection
        private readonly ILogger<ManagementRepository> _logger;
        private readonly IApplicationDbContext _context;
        private readonly IMemoryCache _memoryCache;
        private readonly IConfiguration _configuration;

        public ManagementRepository(ILogger<ManagementRepository> logger, 
            IApplicationDbContext context, 
            IMemoryCache memoryCache,
            IConfiguration configuration)
        {
            _logger = logger;
            _context = context;
            _memoryCache = memoryCache;
            _configuration = configuration;
        }

        public async Task<List<Attribution>> GetAttributions()
        {
            var attributions = await _context.Attribution
                .AsNoTracking()
                .ToListAsync();

            return attributions;
        }

        public async Task<Attribution?> GetAttribution(int id)
        {
            var attribution = await _context.Attribution.FirstOrDefaultAsync(a => a.Id == id);

            return attribution;
        }

        public async Task<List<Models.Version>> GetVersions()
        {
            var versions = await _context.Versions
                .AsNoTracking()
                .ToListAsync();

            return versions;
        }

        public async Task<Models.Version?> GetVersion(int id)
        {
            var version = await _context.Versions.FirstOrDefaultAsync(a => a.Id == id);

            return version;
        }

        public async Task<List<Bound>> GetBounds()
        {
            var bounds = await _context.Bound
                .AsNoTracking()
                .ToListAsync();

            return bounds;
        }

        public async Task<Bound?> GetBound(int id)
        {
            var bound = await _context.Bound.FirstOrDefaultAsync(a => a.Id == id);

            return bound;
        }

        public async Task<List<Theme>> GetThemes()
        {
            var themes = await _context.Theme
                .AsNoTracking()
                .ToListAsync();

            return themes;
        }

        public async Task<Theme?> GetTheme(int id)
        {
            var theme = await _context.Theme.FirstOrDefaultAsync(a => a.Id == id);

            return theme;
        }

        public async Task<List<WelcomeMessage>> GetWelcomeMessages()
        {
            var welcomeMessages = await _context.WelcomeMessages
                .AsNoTracking()
                .ToListAsync();

            return welcomeMessages;
        }

        public async Task<WelcomeMessage?> GetWelcomeMessage(int id)
        {
            var welcomeMessage = await _context.WelcomeMessages.FirstOrDefaultAsync(a => a.Id == id);

            return welcomeMessage;
        }

        public async Task<List<WebLayerServiceDefinition>> GetWebLayerServiceDefinitions()
        {
            var webLayerServiceDefinitions = await _context.WebLayerServiceDefinitions
                .AsNoTracking()
                .ToListAsync();

            return webLayerServiceDefinitions;
        }

        public async Task<Layer?> GetLayer(int id)
        {
            var layer = await _context.Layer
                .Include(l => l.LayerSource)
                .ThenInclude(l => l.LayerSourceType)
                .Include(l => l.LayerSource)
                .ThenInclude(l => l.LayerSourceOptions)
                .FirstOrDefaultAsync(a => a.Id == id);

            return layer;
        }

        public async Task<List<Layer>> GetLayers()
        {
            var layers = await _context.Layer
                .AsNoTracking()
                .ToListAsync();

            return layers;
        }

        public async Task<List<Layer>> GetLayersByLayerSource(int layerSourceId)
        {
            var layers = await _context.Layer.Where(l => l.LayerSourceId == layerSourceId).AsNoTracking().ToListAsync();
            return layers;
        }

        public async Task<LayerSource?> GetLayerSource(int id)
        {
            var layerSource = await _context.LayerSource
                .Include(s => s.LayerSourceOptions)
                .Include(s => s.LayerSourceType)
                .FirstOrDefaultAsync(a => a.Id == id);

            return layerSource;
        }

        public async Task<List<LayerSource>> GetLayerSources()
        {
            var layerSources = await _context.LayerSource
                .AsNoTracking()
                .ToListAsync();

            return layerSources;
        }

        public async Task<LayerSourceOption?> GetLayerSourceOption(int id)
        {
            var layerSource = await _context.LayerSourceOption
                .FirstOrDefaultAsync(a => a.Id == id);

            return layerSource;
        }
        public async Task<WebLayerServiceDefinition?> GetWebLayerServiceDefinition(int id)
        {
            var webLayerServiceDefinition = await _context.WebLayerServiceDefinitions.FirstOrDefaultAsync(a => a.Id == id);

            return webLayerServiceDefinition;
        }

        public async Task<List<TourDetails>> GetTours()
        {
            var tours = await _context.TourDetails
                .Include(t => t.Steps)
                .AsNoTracking()
                .ToListAsync();

            return tours;
        }

        public async Task<TourDetails?> GetTour(int id)
        {
            var tour = await _context.TourDetails.Include(a => a.Steps).FirstOrDefaultAsync(a => a.Id == id);

            return tour;
        }

        public async Task<List<TourStep>> GetSteps()
        {
            var steps = await _context.TourStep
                .AsNoTracking()
                .ToListAsync();

            return steps;
        }

        public async Task<TourStep?> GetStep(int id)
        {
            var step = await _context.TourStep.FirstOrDefaultAsync(a => a.Id == id);

            return step;
        }


        public async Task<Category?> GetLayerCategory(int id)
        {
            var layerCategory = await _context.Category
                .Include(c => c.Layers)
                .Include(c => c.ParentCategory)
                .FirstOrDefaultAsync(a => a.Id == id);

            return layerCategory;
        }

        public async Task<List<Category>> GetLayerCategories()
        {
            var layerCategories = await _context.Category
                .Include(c => c.Layers)
                .Include(c => c.ParentCategory)
                .AsNoTracking()
                .ToListAsync();

            return layerCategories;
        }

        public async Task<List<CategoryLayer>> GetLayerCategoriesLayerAppearsIn(int layerId)
        {
            var layerCategories = await _context.CategoryLayer.Where(c => c.LayerId == layerId).ToListAsync();
            return layerCategories;
        }

        public async Task<List<SearchDefinition>> GetSearchDefinitions()
        {
            var searchDefinitions = await _context.SearchDefinitions
                .AsNoTracking()
                .ToListAsync();

            return searchDefinitions;
        }

        public async Task<SearchDefinition?> GetSearchDefinition(int id)
        {
            var searchDefinition = await _context.SearchDefinitions.FirstOrDefaultAsync(a => a.Id == id);

            return searchDefinition;
        }

        public async Task<List<APISearchDefinition>> GetAPISearchDefinitions()
        {
            var APISearchDefinitions = await _context.APISearchDefinitions
                .AsNoTracking()
                .ToListAsync();

            return APISearchDefinitions;
        }

        public async Task<APISearchDefinition?> GetAPISearchDefinition(int id)
        {
            var APISearchDefinition = await _context.APISearchDefinitions.FirstOrDefaultAsync(a => a.Id == id);

            return APISearchDefinition;
        }

        public async Task<List<DatabaseSearchDefinition>> GetDatabaseSearchDefinitions()
        {
            var databaseSearchDefinitions = await _context.DatabaseSearchDefinitions
                .AsNoTracking()
                .ToListAsync();

            return databaseSearchDefinitions;
        }

        public async Task<DatabaseSearchDefinition?> GetDatabaseSearchDefinition(int id)
        {
            var databaseSearchDefinition = await _context.DatabaseSearchDefinitions.FirstOrDefaultAsync(a => a.Id == id);

            return databaseSearchDefinition;
        }

        public async Task<List<LocalSearchDefinition>> GetLocalSearchDefinitions()
        {
            var localSearchDefinitions = await _context.LocalSearchDefinitions
                .AsNoTracking()
                .ToListAsync();

            return localSearchDefinitions;
        }

        public async Task<LocalSearchDefinition?> GetLocalSearchDefinition(int id)
        {
            var localSearchDefinition = await _context.LocalSearchDefinitions.FirstOrDefaultAsync(a => a.Id == id);

            return localSearchDefinition;
        }

        public async Task<Microsoft.Graph.Beta.Models.UserCollectionResponse?> GetUsers()
        {
            var graphClient = GetGraphClient();
            if (graphClient != null)
            {
                var users = await graphClient.Users.GetAsync();
                return users;
            }
            return null;
        }

        public async Task<Microsoft.Graph.Beta.Models.User?> GetUser(string id)
        {
            var graphClient = GetGraphClient();
            if (graphClient != null)
            {
                var user = await graphClient.Users[id].GetAsync();
                return user;
            }
            return null;
        }

        private GraphServiceClient? GetGraphClient()
        {
            if (!string.IsNullOrEmpty(_configuration.GetSection("AzureAd")["ClientId"]))
            {
                var scopes = new[] { "https://graph.microsoft.com/.default" };


                var tenantId = _configuration.GetSection("AzureAd")["TenantId"];
                var clientId = _configuration.GetSection("AzureAd")["ClientId"];
                var clientSecret = _configuration.GetSection("AzureAd")["ClientSecret"];

                var options = new TokenCredentialOptions
                {
                    AuthorityHost = AzureAuthorityHosts.AzurePublicCloud
                };

                // https://learn.microsoft.com/dotnet/api/azure.identity.clientsecretcredential
                var clientSecretCredential = new ClientSecretCredential(
                    tenantId, clientId, clientSecret, options);

                var graphClient = new GraphServiceClient(clientSecretCredential, scopes);
                return graphClient;
            }
            return null;
        }

        /// <summary>
        /// Purges the .NET memory cache
        /// </summary>
        /// <returns>True or false depending on success or not</returns>
        public bool PurgeCache()
        {
            var memoryCache = _memoryCache as MemoryCache;
            if(memoryCache != null)
            {
                memoryCache.Compact(1);
                return true;
            }
            return false;
        }

        public AnalyticsViewModel GetAnalyticsModel()
        {
            AnalyticsViewModel viewModel = new AnalyticsViewModel();
            viewModel.AvailableAnalytics = _context.AnalyticsDefinitions.Include(a => a.VersionAnalytics).ToList();

            return viewModel;
        }
    }
}
