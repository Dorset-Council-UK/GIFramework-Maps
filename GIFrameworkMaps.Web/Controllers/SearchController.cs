using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models.Search;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Web.Controllers
{
	public class SearchController : Controller
    {
        //dependancy injection
        private readonly ISearchRepository _repository;
        private readonly ILogger<SearchController> _logger;
        public SearchController(ISearchRepository repository, ILogger<SearchController> logger)
        {
            _repository = repository;
            _logger = logger;
        }

        public async Task<JsonResult> Index([FromBody]SearchQuery searchQuery)
        {
            //Sanitise user input to prevent log forging
            _logger.LogInformation("User searched for {searchQuery}", searchQuery.Query.Replace(Environment.NewLine, ""));

			//var results = await _repository.SearchOriginal(searchQuery.Query, searchQuery.Searches);
            var results = await _repository.Search(searchQuery.Query, searchQuery.Searches);

            //Sanitise user input to prevent log forging
            _logger.LogInformation("{TotalResults} results returned for query {searchQuery}", results.TotalResults, searchQuery.Query.Replace(Environment.NewLine, ""));

            return Json(results);
        }

        [ResponseCache(Duration = 300, VaryByQueryKeys = ["id"])]
        public async Task<JsonResult> Options(int id)
        {
            var searchOpts = await _repository.GetSearchDefinitionsByVersion(id);

            //convert to smaller payload required for map
            //This might be better converted with something like AutoMapper
            //but for now this works
            List<RequiredSearch> searches = [];
            
            foreach(var opt in searchOpts)
            {
                searches.Add(new RequiredSearch
                {
                    Enabled = opt.Enabled,
                    Name = opt.SearchDefinition.Name,
                    Order = opt.Order,
                    SearchDefinitionId = opt.SearchDefinition.Id,
                    StopIfFound = opt.StopIfFound
                });
            }

            return Json(searches);
        }
    }
}
