using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models.Search;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
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

        public JsonResult Index([FromBody]SearchQuery searchQuery)
        {
            _logger.LogInformation("User searched for {searchQuery}",searchQuery.Query);
            var results = _repository.Search(searchQuery.Query, searchQuery.Searches);
            _logger.LogInformation("{TotalResults} results returned for query {searchQuery}", results.TotalResults,searchQuery.Query);
            return Json(results);
        }

        [ResponseCache(Duration = 300, VaryByQueryKeys = new string[] {"id" })]
        public JsonResult Options(int id)
        {
            var searchOpts = _repository.GetSearchDefinitionsByVersion(id);
            return Json(searchOpts);
        }
    }
}
