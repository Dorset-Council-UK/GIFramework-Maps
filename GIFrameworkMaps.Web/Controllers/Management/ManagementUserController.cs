using Azure.Identity;
using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Graph;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers.Management
{
    [Authorize(Roles = "GIFWAdmin")]
    public class ManagementUserController : Controller
    {
        //dependancy injection
        /*NOTE: A repository pattern is used for much basic data access across the project
         * however, write and update are done directly on the context based on the advice here
         * https://learn.microsoft.com/en-us/aspnet/mvc/overview/getting-started/getting-started-with-ef-using-mvc/advanced-entity-framework-scenarios-for-an-mvc-web-application#create-an-abstraction-layer
         * */
        private readonly ILogger<ManagementUserController> _logger;
        private readonly IManagementRepository _repository;
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        public ManagementUserController(
            ILogger<ManagementUserController> logger,
            IManagementRepository repository,
            ApplicationDbContext context,
            IConfiguration configuration
            )
        {
            _logger = logger;
            _repository = repository;
            _context = context;
            _configuration = configuration;
        }
        public async Task<IActionResult> Index()
        {

            if (!string.IsNullOrEmpty(_configuration.GetSection("AzureAd")["ClientId"]))
            {
                var scopes = new[] { "https://graph.microsoft.com/.default" };

                // Multi-tenant apps can use "common",
                // single-tenant apps must use the tenant ID from the Azure portal
                var tenantId = _configuration.GetSection("AzureAd")["TenantId"];

                // Values from app registration
                var clientId = _configuration.GetSection("AzureAd")["ClientId"];
                var clientSecret = _configuration.GetSection("AzureAd")["ClientSecret"];

                // using Azure.Identity;
                var options = new TokenCredentialOptions
                {
                    AuthorityHost = AzureAuthorityHosts.AzurePublicCloud
                };

                // https://learn.microsoft.com/dotnet/api/azure.identity.clientsecretcredential
                var clientSecretCredential = new ClientSecretCredential(
                    tenantId, clientId, clientSecret, options);
                
                var graphClient = new GraphServiceClient(clientSecretCredential, scopes);

                var users = await graphClient.Users
                    .Request()
                    .GetAsync();

                return View(users);
            }
            else
            {
                return NotFound();
            }
        }

        public async Task<IActionResult> Edit(string id)
        {

            if (!string.IsNullOrEmpty(_configuration.GetSection("AzureAd")["ClientId"]))
            {
                var scopes = new[] { "https://graph.microsoft.com/.default" };

                // Multi-tenant apps can use "common",
                // single-tenant apps must use the tenant ID from the Azure portal
                var tenantId = _configuration.GetSection("AzureAd")["TenantId"];

                // Values from app registration
                var clientId = _configuration.GetSection("AzureAd")["ClientId"];
                var clientSecret = _configuration.GetSection("AzureAd")["ClientSecret"];

                // using Azure.Identity;
                var options = new TokenCredentialOptions
                {
                    AuthorityHost = AzureAuthorityHosts.AzurePublicCloud
                };

                // https://learn.microsoft.com/dotnet/api/azure.identity.clientsecretcredential
                var clientSecretCredential = new ClientSecretCredential(
                    tenantId, clientId, clientSecret, options);

                var graphClient = new GraphServiceClient(clientSecretCredential, scopes);

                var user = await graphClient.Users[id]
                    .Request()
                    .GetAsync();
                if(user != null)
                {
                    //fetch roles and version permissions
                    return View(user);
                }
                
            }
            
            return NotFound();
            
        }

    }
}
