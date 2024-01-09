using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models.Search;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;

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

        public JsonResult Index([FromBody]SearchQuery searchQuery)
        {
            _logger.LogInformation("User searched for {searchQuery}",
                //Sanitise user input to prevent log forging
                searchQuery.Query.Replace(Environment.NewLine, ""));
            var results = _repository.Search(searchQuery.Query, searchQuery.Searches);
            _logger.LogInformation("{TotalResults} results returned for query {searchQuery}", results.TotalResults,
                //Sanitise user input to prevent log forging
                searchQuery.Query.Replace(Environment.NewLine, ""));
            return Json(results);
        }

        [ResponseCache(Duration = 300, VaryByQueryKeys = new string[] {"id" })]
        public JsonResult Options(int id)
        {
            var searchOpts = _repository.GetSearchDefinitionsByVersion(id);
            //convert to smaller payload required for map
            //This might be better converted with something like AutoMapper
            //but for now this works
            List<RequiredSearch> searches = new();
            
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
