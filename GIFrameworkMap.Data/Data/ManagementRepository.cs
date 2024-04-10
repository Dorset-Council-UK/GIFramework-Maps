using Azure.Identity;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Search;
using GIFrameworkMaps.Data.Models.Tour;
using GIFrameworkMaps.Data.ViewModels.Management;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Graph.Beta;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data
{
	public class ManagementRepository : IManagementRepository
    {
        //dependancy injection
        private readonly IApplicationDbContext _context;
        private readonly IMemoryCache _memoryCache;
        private readonly IConfiguration _configuration;

        public ManagementRepository(
            IApplicationDbContext context, 
            IMemoryCache memoryCache,
            IConfiguration configuration)
        {
            _context = context;
            _memoryCache = memoryCache;
            _configuration = configuration;
        }

        public async Task<List<Attribution>> GetAttributions()
        {
            return await _context.Attributions
				.AsNoTracking()
				.ToListAsync();
		}

        public async Task<Attribution?> GetAttribution(int id)
        {
            return await _context.Attributions.FindAsync(id);
        }

        public async Task<List<Bound>> GetBounds()
        {
            return await _context.Bounds
				.AsNoTracking()
				.ToListAsync();
		}

        public async Task<Bound?> GetBound(int id)
        {
            return await _context.Bounds.FindAsync(id);
		}

        public async Task<List<Theme>> GetThemes()
        {
            return await _context.Themes
				.AsNoTracking()
				.ToListAsync();
		}

        public async Task<Theme?> GetTheme(int id)
        {
            return await _context.Themes.FindAsync(id);
        }

        public async Task<List<WelcomeMessage>> GetWelcomeMessages()
        {
            return await _context.WelcomeMessages
				.AsNoTracking()
				.ToListAsync();
		}

        public async Task<WelcomeMessage?> GetWelcomeMessage(int id)
        {
            return await _context.WelcomeMessages.FindAsync(id);
        }

        public async Task<List<WebLayerServiceDefinition>> GetWebLayerServiceDefinitions()
        {
            return await _context.WebLayerServiceDefinitions
				.AsNoTracking()
				.ToListAsync();
		}

        public async Task<Layer?> GetLayer(int id)
        {
            return await _context.Layers.FindAsync(id);
		}

        public async Task<List<Layer>> GetLayers()
        {
            return await _context.Layers
				.AsNoTracking()
				.ToListAsync();
		}

        public async Task<List<Layer>> GetLayersByLayerSource(int layerSourceId)
        {
            return await _context.Layers
				.AsNoTracking()
				.Where(l => l.LayerSourceId == layerSourceId)
				.ToListAsync();
		}

        public async Task<LayerSource?> GetLayerSource(int id)
        {
            return await _context.LayerSources.FindAsync(id);
		}

        public async Task<List<LayerSource>> GetLayerSources()
        {
            return await _context.LayerSources
				.AsNoTracking()
				.ToListAsync();
		}

        public async Task<LayerSourceOption?> GetLayerSourceOption(int id)
        {
            return await _context.LayerSourceOptions.FindAsync(id);
		}

        public async Task<WebLayerServiceDefinition?> GetWebLayerServiceDefinition(int id)
        {
            return await _context.WebLayerServiceDefinitions.FindAsync(id);
		}

        public async Task<List<TourStep>> GetSteps()
        {
            return await _context.TourSteps
				.AsNoTracking()
				.ToListAsync();
        }

        public async Task<Category?> GetLayerCategory(int id)
        {
            return await _context.Categories
				.AsNoTracking()
				.Include(c => c.ParentCategory)
				.FirstOrDefaultAsync(a => a.Id == id);
		}

        public async Task<List<Category>> GetLayerCategories()
        {
            return await _context.Categories
				.AsNoTracking()
				.Include(o => o.ParentCategory)
				.ToListAsync();
		}

        public async Task<List<CategoryLayer>> GetLayerCategoriesLayerAppearsIn(int layerId)
        {
            return await _context.CategoryLayers
				.AsNoTracking()
				.Where(c => c.LayerId == layerId)
				.ToListAsync();
		}

        public async Task<List<SearchDefinition>> GetSearchDefinitions()
        {
            return await _context.SearchDefinitions
				.AsNoTracking()
				.ToListAsync();
		}

        public async Task<SearchDefinition?> GetSearchDefinition(int id)
        {
            return await _context.SearchDefinitions.FindAsync(id);
		}

        public async Task<List<APISearchDefinition>> GetAPISearchDefinitions()
        {
            return await _context.APISearchDefinitions
				.AsNoTracking()
				.ToListAsync();
		}

        public async Task<APISearchDefinition?> GetAPISearchDefinition(int id)
        {
            return await _context.APISearchDefinitions.FindAsync(id);
		}

        public async Task<List<DatabaseSearchDefinition>> GetDatabaseSearchDefinitions()
        {
            return await _context.DatabaseSearchDefinitions
				.AsNoTracking()
				.ToListAsync();
		}

        public async Task<DatabaseSearchDefinition?> GetDatabaseSearchDefinition(int id)
        {
            return await _context.DatabaseSearchDefinitions.FindAsync(id);
		}

        public async Task<List<LocalSearchDefinition>> GetLocalSearchDefinitions()
        {
            return await _context.LocalSearchDefinitions
				.AsNoTracking()
				.ToListAsync();
		}

        public async Task<LocalSearchDefinition?> GetLocalSearchDefinition(int id)
        {
            return await _context.LocalSearchDefinitions.FindAsync(id);
		}

        public async Task<List<Microsoft.Graph.Beta.Models.User>> GetUsers()
        {
            string cachekey = "AllGraphUsers";
            if(_memoryCache.TryGetValue(cachekey, out List <Microsoft.Graph.Beta.Models.User>? cachedUsers))
            {
                if (cachedUsers != null)
                {
                    return cachedUsers;
                }
            }
            List<Microsoft.Graph.Beta.Models.User> allUsers = new();
            var graphClient = GetGraphClient();
            if (graphClient != null)
            {
                var users = await graphClient.Users.GetAsync();
                if (users != null && users.Value != null)
                {
                    allUsers.AddRange(users.Value);
                    string? skipLink = users.OdataNextLink;
                    bool hasNextPage = !string.IsNullOrEmpty(skipLink);
                    while (hasNextPage)
                    {

                        var nextPage = await graphClient.Users.WithUrl(skipLink).GetAsync();
                        if (nextPage != null && nextPage.Value != null)
                        {
                            allUsers.AddRange(nextPage.Value);
                            skipLink = nextPage.OdataNextLink;
                            hasNextPage = !string.IsNullOrEmpty(skipLink);
                        }
                    }
                }
                else
                {
                    throw new System.Exception("Graph client could not be initialized");
                }
            }
            if (allUsers.Any())
            {
                _memoryCache.Set(cachekey, allUsers, System.TimeSpan.FromMinutes(5));
            }
            return allUsers;
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
            if (_memoryCache is MemoryCache memoryCache)
            {
                memoryCache.Compact(1);
                return true;
            }
            return false;
        }

        public AnalyticsViewModel GetAnalyticsModel()
        {
            var viewModel = new AnalyticsViewModel()
            {
                AvailableAnalytics = _context.AnalyticsDefinitions
					.AsNoTracking()
					.Include(a => a.VersionAnalytics)
					.ToList()
            };

            return viewModel;
        }

		public async Task<Projection?> GetProjection(int id)
		{
			return await _context.Projections.FindAsync(id);
		}

		public async Task<List<Projection>> GetProjections()
		{
			return await _context.Projections
				.AsNoTracking()
				.ToListAsync();
		}
	}
}
