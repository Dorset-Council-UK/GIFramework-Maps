using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Search;
using Google.OpenLocationCode;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

[assembly: InternalsVisibleTo("GIFrameworkMaps.Tests")]
namespace GIFrameworkMaps.Data
{
    public partial class SearchRepository : ISearchRepository
    {
        //dependancy injection
        private readonly ILogger<SearchRepository> _logger;
        private readonly IApplicationDbContext _context;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IMemoryCache _memoryCache;
        public SearchRepository(ILogger<SearchRepository> logger, IApplicationDbContext context, IHttpClientFactory httpClientFactory, IHttpContextAccessor httpContextAccessor, IMemoryCache memoryCache)
        {
            _logger = logger;
            _context = context;
            _httpClientFactory = httpClientFactory;
            _httpContextAccessor = httpContextAccessor;
            _memoryCache = memoryCache;
        }

        /// <summary>
        /// Gets the search definitions for a particular version
        /// </summary>
        /// <param name="versionId">The ID of the version to get search definitions for</param>
        /// <returns>List of VersionSearchDefinition</returns>
        /// <exception cref="KeyNotFoundException">Returned when the version can not be found</exception>
        public List<VersionSearchDefinition> GetSearchDefinitionsByVersion(int versionId)
        {
            if (_context.Versions.Where(v => v.Id == versionId).AsNoTrackingWithIdentityResolution().Any())
            {                
                string cacheKey = "SearchDefinitions/" + versionId.ToString();

                // Check to see if the results of this search have already been cached and, if so, return that.
                if (_memoryCache.TryGetValue(cacheKey, out List<VersionSearchDefinition> cacheValue))
                {
                    return cacheValue;
                }
                else
                {
                    var searchDefs = _context.VersionSearchDefinition
                        .Where(v => v.VersionId == versionId)
                        .AsNoTrackingWithIdentityResolution()
                        .Include(v => v.SearchDefinition)
                        .ToList();

                    //If null get default based on general version (which should always exist)
                    if (searchDefs is null || searchDefs.Count == 0)
                    {
                        searchDefs = _context.VersionSearchDefinition
                            .Where(v => v.Version.Slug == "general")
                            .AsNoTrackingWithIdentityResolution()
                            .Include(v => v.SearchDefinition)
                            .ToList();
                    }

                    // Cache the results so they can be used next time we call this function.
                    _memoryCache.Set(cacheKey, searchDefs, TimeSpan.FromMinutes(10));
                    return searchDefs;
                }
            }
            else
            {
                throw new KeyNotFoundException($"Version with ID {versionId} does not exist");
            }
        }

        /// <summary>
        ///     Performs a complex text search based on the search term provided made up of specified multiple searches 
        ///     </summary>
        ///     <param name="searchTerm">The search argument</param>
        ///     <param name="requiredSearchesList">List of searches which can be performed</param>
        ///     <returns>Returns results sets from each of the searches actually performed</returns>
        ///     <remarks></remarks>
        public SearchResults Search(string searchTerm, List<RequiredSearch> requiredSearchesList)
        {
            SearchResults searchResults = new SearchResults();

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                searchTerm = searchTerm.Trim();
                                
                var orderedList = requiredSearchesList.OrderBy(x => x.Order);
                    
                /*TODO - Make this statement check the version and only get defs for that version*/
                //Gets the full search definition details from the database
                List<VersionSearchDefinition> searchDefs = _context.VersionSearchDefinition
                    .Include(v => v.SearchDefinition)
                    .AsNoTrackingWithIdentityResolution()
                    .ToList();

                foreach (var reqSearch in orderedList)
                {
                    if (reqSearch.Enabled)
                    {
                        IEnumerable<VersionSearchDefinition> defs = searchDefs.Where(d => d.SearchDefinitionId == reqSearch.SearchDefinitionId);
                        if (defs.NotNullOrEmpty())
                        {
                            var selectedDefinition = defs!.First().SearchDefinition;
                                                       
                            if(IsValidSearchTerm(selectedDefinition))
                            {
                                SearchResultCategory searchResultCategory = new SearchResultCategory
                                {
                                    CategoryName = selectedDefinition!.Title,
                                    Ordering = reqSearch.Order,
                                    AttributionHtml = selectedDefinition!.AttributionHtml,
                                    SupressGeom = selectedDefinition.SupressGeom
                                };
                                try
                                {
                                    var results = SingleSearch(searchTerm, selectedDefinition);
                                    if (results.NotNullOrEmpty())
                                    {
                                        searchResultCategory.Results = results;
                                        searchResults.ResultCategories.Add(searchResultCategory);
                                    }
                                }catch(Exception ex)
                                {
                                    //set the error flag as something went wrong. We still want to carry on with other searches though
                                    _logger.LogError(ex,ex.Message);
                                    searchResults.IsError = true;
                                }
                                // Stop search now if flag set on current search and something found since last time flag set
                                if (searchResultCategory.Results.NotNullOrEmpty() & reqSearch.StopIfFound)
                                    break;
                            }
                        }
                    }
                }
            }
            searchResults.TotalResults = searchResults.ResultCategories.Sum(r => r.Results.Count);
            return searchResults;


            //A search term is valid if it's blank or it matches the Required Search's validation regular expression. 
            bool IsValidSearchTerm(SearchDefinition? selectedDefinition)
            {
                if (selectedDefinition == null)
                    return false;

                if (!string.IsNullOrEmpty(selectedDefinition.ValidationRegex))
                {
                    var validationRegex = new Regex(selectedDefinition.ValidationRegex);
                    return validationRegex.IsMatch(searchTerm);
                }
                return true;
            }
        }

        /// <summary>
        /// Performs a search against a particular search definition
        /// </summary>
        /// <param name="searchTerm">The search term to search for</param>
        /// <param name="searchDefinition">The search definition to search against</param>
        /// <returns>List of Search Results</returns>
        private List<SearchResult> SingleSearch(string searchTerm, SearchDefinition searchDefinition)
        {
            var searchResults = new List<SearchResult>();
            var apiSearchDefs = GetAPISearchDefinitions();
            var dbSearchDefs = GetDBSearchDefinitions();
            var localSearchDefs = GetLocalSearchDefinitions();

            if(apiSearchDefs.Any(d => d.Id == searchDefinition.Id))
            {
                //API Search
                var fullSearchDef = apiSearchDefs.Where(d => d.Id == searchDefinition.Id).FirstOrDefault();
                searchResults = APISearchAsync(searchTerm, fullSearchDef).Result;
            }
            else if(dbSearchDefs.Any(d => d.Id == searchDefinition.Id))
            {
                //DB Search
                var fullSearchDef = dbSearchDefs.Where(d => d.Id == searchDefinition.Id).FirstOrDefault();
                searchResults = DBSearch(searchTerm, fullSearchDef);
            }
            else if(localSearchDefs.Any(d => d.Id == searchDefinition.Id))
            {
                var fullSearchDef = localSearchDefs.Where(d => d.Id == searchDefinition.Id).FirstOrDefault();
                searchResults = LocalSearch(searchTerm, fullSearchDef);
            }

            return searchResults;
        }

        /// <summary>
        /// Gets the list of possible API Search Definitions
        /// </summary>
        /// <returns>List of APISearchDefinition</returns>
        private List<APISearchDefinition> GetAPISearchDefinitions()
        {
            // Check to see if the results of this search have already been cached and, if so, return that.
            if (_memoryCache.TryGetValue("APISearchDefinitions", out List<APISearchDefinition> cacheValue))
            {
                return cacheValue;
            }
            else
            {
                List<APISearchDefinition> defs = _context.APISearchDefinitions
                    .AsNoTrackingWithIdentityResolution()
                    .ToList();

                // Cache the results so they can be used next time we call this function.
                if (defs.Any())
                {
                    _memoryCache.Set("APISearchDefinitions", defs, TimeSpan.FromHours(1));
                }
                return defs;
            }           
        }
        /// <summary>
        /// Gets the list of possible Database Search Definitions
        /// </summary>
        /// <returns>List of DatabaseSearchDefinition</returns>
        private List<DatabaseSearchDefinition> GetDBSearchDefinitions()
        {
            // Check to see if the results of this search have already been cached and, if so, return that.
            if (_memoryCache.TryGetValue("DBSearchDefinitions", out List<DatabaseSearchDefinition> cacheValue))
            {
                return cacheValue;
            }
            else
            {
                List<DatabaseSearchDefinition> defs = _context.DatabaseSearchDefinitions
                    .AsNoTrackingWithIdentityResolution()
                    .ToList();

                // Cache the results so they can be used next time we call this function.
                if (defs.Any())
                {
                    _memoryCache.Set("DBSearchDefinitions", defs, TimeSpan.FromHours(1));
                }
                return defs;
            }
        }
        /// <summary>
        /// Gets the list of possible Local Search Definitions
        /// </summary>
        /// <returns>List of LocalSearchDefinition</returns>
        private List<LocalSearchDefinition> GetLocalSearchDefinitions()
        {
            // Check to see if the results of this search have already been cached and, if so, return that.
            if (_memoryCache.TryGetValue("LocalSearchDefinitions", out List<LocalSearchDefinition> cacheValue))
            {
                return cacheValue;
            }
            else
            {
                List<LocalSearchDefinition> defs = _context.LocalSearchDefinitions
                    .AsNoTrackingWithIdentityResolution()
                    .ToList();

                // Cache the results so they can be used next time we call this function.
                if (defs.Any())
                {
                    _memoryCache.Set("LocalSearchDefinitions", defs, TimeSpan.FromHours(1));
                }
                return defs;
            }
        }

        /// <summary>
        /// Performs a search against a web based API
        /// </summary>
        /// <param name="searchTerm">The search term to search for</param>
        /// <param name="searchDefinition">The search definition to search against</param>
        /// <returns>List of Search Results</returns>
        private async Task<List<SearchResult>> APISearchAsync(string searchTerm, APISearchDefinition searchDefinition)
        {
            //make a HTTP request to the defined search endpoint
            var request = new HttpRequestMessage(HttpMethod.Get,
                searchDefinition.URLTemplate.Replace("{{search}}", searchTerm));

            request.Headers.Add("User-Agent", "HttpClientFactory-GIFrameworkMaps");
            var referer = $"{_httpContextAccessor.HttpContext.Request.Scheme}://{_httpContextAccessor.HttpContext.Request.Host.Value}";
            request.Headers.Add("Referer", referer);
                      
            var client = _httpClientFactory.CreateClient();
            var response = await client.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {                
                var content = await response.Content.ReadAsStringAsync();
             
                var results = GetResultsFromJSONString(content, searchDefinition);
                return results;
            }
            return null;
        }

        /// <summary>
        /// Extracts properly formatted search results from a JSON string using a particular searchDefinition
        /// </summary>
        /// <param name="content">The JSON string to get the results from</param>
        /// <param name="searchDefinition">The search definition to use</param>
        /// <returns>List of SearchResult</returns>
        internal static List<SearchResult> GetResultsFromJSONString(string content, APISearchDefinition searchDefinition)
        {
            var contentAsJSON = JToken.Parse(content);

            //extract paths from title field template
            var template = "{0}";
            var titlePaths = new List<string>
            {
                searchDefinition.TitleFieldPath
            };
            Regex rx = HandlebarsPlaceholder();
            if (rx.IsMatch(searchDefinition.TitleFieldPath))
            {
                var templateIndex = -1;
                
                template = rx.Replace(searchDefinition.TitleFieldPath, match =>
                {
                    templateIndex++;
                    return match.Result($"{{{templateIndex}}}");
                });
                titlePaths = rx.Matches(searchDefinition.TitleFieldPath).Select(m => m.Value.Replace("{{","").Replace("}}","")).ToList();
            }
            
            List<IList<JToken>> titleParts = new();
            foreach (var titlePath in titlePaths)
            {
                IList<JToken> titlePart = null;
                PopulateJTokenLists(ref titlePart, titlePath);
                titleParts.Add(titlePart);
            }

            IList<JToken>? xCoords = null, yCoords = null, mbrXMinCoords = null, mbrYMinCoords = null, mbrXMaxCoords = null, mbrYMaxCoords = null, geom = null;

            PopulateJTokenLists(ref xCoords, searchDefinition.XFieldPath);
            PopulateJTokenLists(ref yCoords, searchDefinition.YFieldPath);

            PopulateJTokenLists(ref mbrXMinCoords, searchDefinition.MBRXMinPath);
            PopulateJTokenLists(ref mbrYMinCoords, searchDefinition.MBRYMinPath);
            PopulateJTokenLists(ref mbrXMaxCoords, searchDefinition.MBRXMaxPath);
            PopulateJTokenLists(ref mbrYMaxCoords, searchDefinition.MBRYMaxPath);

            PopulateJTokenLists(ref geom, searchDefinition.GeomFieldPath);

            var i = 0;
            var results = new List<SearchResult>();
            /*TODO - getting a single set of titles acts as a way of iterating through the full results list consistently. This is a bit messy!*/
            IEnumerable<JToken> titles = contentAsJSON.SelectTokens(titlePaths.First());
            foreach (var title in titles)
            {
                var resultTitleParts = new List<string>();
                foreach(var r in titleParts)
                {
                    resultTitleParts.Add(r[i].ToString());
                }
                var result = new SearchResult
                {
                    DisplayText = string.Format(template, resultTitleParts.ToArray()),
                    EPSG = searchDefinition.EPSG,
                    Ordering = i,
                    Zoom = searchDefinition.ZoomLevel
                };
                //check whether we've received an X/Y
                if (JTokensExist(xCoords, yCoords))
                {
                    result.X = decimal.Parse(xCoords[i].ToString());
                    result.Y = decimal.Parse(yCoords[i].ToString());
                }
                //check whether we've received an MBR
                if (JTokensExist(mbrXMinCoords, mbrYMinCoords, mbrXMaxCoords, mbrYMaxCoords))
                {
                    result.Bbox = new decimal[4] {
                            decimal.Parse(mbrXMinCoords[i].ToString()),
                            decimal.Parse(mbrYMinCoords[i].ToString()),
                            decimal.Parse(mbrXMaxCoords[i].ToString()),
                            decimal.Parse(mbrYMaxCoords[i].ToString())
                        };
                }
                //check whether we've received a geom
                if (JTokensExist(geom))
                {
                    result.Geom = geom[i].ToString();
                }               

                results.Add(result);
                i++;
            }
            return results;

            void PopulateJTokenLists(ref IList<JToken> tokens, string? field)
            {
                //Only proceed if all of the fields are neither null nor blank.
                if (!string.IsNullOrEmpty(field))
                {
                        //For each list of JTokens, populate them from the appropriate path.
                        tokens = contentAsJSON.SelectTokens(field).ToList();
                }
            }

            bool JTokensExist(params IList<JToken?>[] tokens)
            {
                return tokens.All(t => t is not null && t.Any());
            }
        }

        /// <summary>
        /// Performs a search against a database and formats the response
        /// </summary>
        /// <param name="searchTerm">The search term to search for</param>
        /// <param name="searchDefinition">The search definition to search against</param>
        /// <returns>List of SearchResult</returns>
        private List<SearchResult> DBSearch(string searchTerm, DatabaseSearchDefinition searchDefinition)
        {
            List<DatabaseSearchResult> dbResults = GetDBSearchResults(searchTerm, searchDefinition);

            if (dbResults.NotNullOrEmpty())
            {
                var results = new List<SearchResult>();
                int ordering = 1;
                foreach (var result in dbResults)
                {
                    if (!string.IsNullOrEmpty(result.GeomField))
                    {
                        results.Add(new SearchResult
                        {
                            DisplayText = result.TitleField,
                            EPSG = searchDefinition.EPSG,
                            Ordering = ordering,
                            Zoom = searchDefinition.ZoomLevel.GetValueOrDefault(),
                            Geom = result.GeomField
                        });
                    }
                    else if (result.XField.HasValue && result.YField.HasValue)
                    {
                        results.Add(new SearchResult
                        {
                            DisplayText = result.TitleField,
                            EPSG = searchDefinition.EPSG,
                            Ordering = ordering,
                            Zoom = searchDefinition.ZoomLevel.GetValueOrDefault(),
                            X = (decimal)result.XField.Value,
                            Y = (decimal)result.YField.Value
                        });
                    }

                    ordering++;
                }
                return results;
            }

            return null;
        }

        /// <summary>
        /// Performs database search for a searchDefinition
        /// </summary>
        /// <param name="searchTerm">The search term to search for</param>
        /// <param name="searchDefinition">The search definition to search against</param>
        /// <returns>List of DatabaseSearchResult</returns>
        private List<DatabaseSearchResult> GetDBSearchResults(string searchTerm, DatabaseSearchDefinition searchDefinition)
        {
            //sort out the params
            var searchParams = new List<Npgsql.NpgsqlParameter>();
            string parameterizedWhereClause = searchDefinition.WhereClause;
            ParameterizeClause(ref parameterizedWhereClause, searchTerm, ref searchParams);

            var sql = $@"SELECT {NameOrNullIfBlank(searchDefinition.TitleField)} as TitleField,
                                {NameOrNullIfBlank(searchDefinition.GeomField)} as GeomField,
                                {NameOrNullIfBlank(searchDefinition.XField)} as XField,
                                {NameOrNullIfBlank(searchDefinition.YField)} as YField
                        FROM {searchDefinition.TableName}
                        WHERE {parameterizedWhereClause}";
                      
            if (!string.IsNullOrEmpty(searchDefinition.OrderByClause))
            {
                string parameterizedOrderByClause = searchDefinition.OrderByClause;
                ParameterizeClause(ref parameterizedOrderByClause, searchTerm, ref searchParams);
                sql += $" ORDER BY {parameterizedOrderByClause}";
            }
           
            return _context.DatabaseSearchResults.FromSqlRaw(sql, searchParams.ToArray()).ToList();

            static string NameOrNullIfBlank(string? name)
            {
                return string.IsNullOrEmpty(name) ? "NULL" : name;
            }
        }

        /// <summary>
        /// Performs one of the internal searches
        /// </summary>
        /// <param name="searchTerm">The search term to search for</param>
        /// <param name="searchDefinition">The search definition to search against</param>
        /// <returns>List of SearchResult</returns>
        internal static List<SearchResult> LocalSearch(string searchTerm, LocalSearchDefinition searchDefinition)
        {
            var results = new List<SearchResult>();

            switch (searchDefinition.LocalSearchName)
            {
                case "BNG12Figure":
                    /*if we've hit this point the regex has been validated*/
                    /*extract x and y from string*/
                    if (CanSplitSearchIntoTwoDecimals(out decimal x,out decimal y)
                        && CoordHelper.ValidateBNG12Figure(x, y))
                    {                        
                        AddResult($"{x}, {y}", x, y);
                        return results;
                    } 
                    break;

                case "BNGAlphaNumeric":
                    int[] xyCoords = CoordHelper.ConvertAlphaBNGTo12Figure(searchTerm);
                    if(xyCoords is not null
                        && CoordHelper.ValidateBNG12Figure(xyCoords[0],xyCoords[1]))
                    {                        
                        AddResult($"{searchTerm.ToUpper()} ({xyCoords[0]}, {xyCoords[1]})", xyCoords[0], xyCoords[1]);
                        return results;
                    }
                    break;

                case "LatLonDecimal":                    
                    if (CanSplitSearchIntoTwoDecimals(out decimal latitude, out decimal longitude)
                        && CoordHelper.ValidateLatLon(latitude, longitude))
                    {                        
                        AddResult($"{latitude}, {longitude}", longitude, latitude);
                        return results;
                    };
                    break;

                case "LatLonDMS":
                    /*attempt to split the DMS into two parts by the N or S string that should be included*/
                    /*TODO - Would be good if this could handle not having N/S. This would require changes to the DB enforced RegEx*/


                    string[] dmsCoords = Regex.Split(searchTerm, @"(?<=[NS])");


                    if (dmsCoords is not null && dmsCoords.Length == 2)
                    {
                        decimal decimalLatitude = CoordHelper.ConvertDMSCoordinateToDecimal(dmsCoords[0]);
                        decimal decimalLongitude = CoordHelper.ConvertDMSCoordinateToDecimal(dmsCoords[1]);
                        if (CoordHelper.ValidateLatLon(decimalLatitude, decimalLongitude))
                        {                            
                            AddResult($"{searchTerm} (approx {Math.Round(decimalLatitude, 5)}, {Math.Round(decimalLongitude, 5)})",
                                decimalLongitude, decimalLatitude);
                            return results;
                        }
                    }
                    break;

                case "SphericalMercator":
                   if (CanSplitSearchIntoTwoDecimals(out decimal smX, out decimal smY)
                        && CoordHelper.ValidateSphericalMercator(smX, smY))
                    {
                        AddResult($"{smX}, {smY}", smX, smY);
                        return results;
                    };
                    break;

                case "PlusCode":                    
                    if (OpenLocationCode.IsValid(searchTerm) && OpenLocationCode.IsFull(searchTerm))
                    {
                        CodeArea codeArea = OpenLocationCode.Decode(searchTerm);
                        if(codeArea is not null)
                        {
                            AddResult($"{searchTerm} (Approx {Convert.ToDecimal(codeArea.CenterLatitude)}, {Convert.ToDecimal(codeArea.CenterLongitude)})",
                                Convert.ToDecimal(codeArea.CenterLongitude), Convert.ToDecimal(codeArea.CenterLatitude));
                            return results;
                        }
                    }
                    break;
            }

            return null;

            bool CanSplitSearchIntoTwoDecimals(out decimal decimal1, out decimal decimal2)
            {
                //split at comma if the search term contains one.
                string[] searchTerms = searchTerm.Contains(',') ?
                    searchTerm.Replace(" ", "").Split(",", 2) :
                    searchTerm.Split(" ", 2);
                if(searchTerms.Length == 2)
                {
                    bool canSplit = decimal.TryParse(searchTerms[0], out decimal decimal1Temp)
                                & decimal.TryParse(searchTerms[1], out decimal decimal2Temp);
                    decimal1 = decimal1Temp;
                    decimal2 = decimal2Temp;

                    return canSplit;
                }
                //need to define the out params even when not used
                decimal1 = decimal.Zero;
                decimal2 = decimal.Zero;
                return false;
            }

            //Add a new search result to results, using the specific values per local search.
            void AddResult(string displayText, decimal x, decimal y)
            {
                results.Add(new SearchResult
                {
                    DisplayText = displayText,
                    EPSG = searchDefinition.EPSG,
                    X = x,
                    Y = y,
                    Ordering = 1,
                    Zoom = searchDefinition.ZoomLevel.GetValueOrDefault()
                });
            }
        }

        /// <summary>
        /// Converts a SQL clause into a paramaterised clause with and {{search}} terms appropriately replaced
        /// </summary>
        /// <param name="clause">The clause that has the search tokens</param>
        /// <param name="searchTerm">The search term</param>
        /// <param name="searchParams">An existing list of DB paramaters</param>
        private static void ParameterizeClause(ref string clause, string searchTerm, ref List<Npgsql.NpgsqlParameter> searchParams)
        {
            //finds all the {{search}} tokens
            var searchPlaceholders = Regex.Matches(clause, "{[^{]*{search}[^}]*}");
            int i = searchParams.Count;
            var parameterizedClause = clause;
            int shift = 0;
            //loop through the search tokens and replace them with paramterised versions
            foreach(Match p in searchPlaceholders)
            {                
                int replaceStart = p.Index + shift;

                string searchParam = p.Value.Replace("{search}", searchTerm)
                                            .Replace("{", "")
                                            .Replace("}", "");
                searchParams.Add(new Npgsql.NpgsqlParameter($"@param{i}",searchParam));
                int lenBefore = parameterizedClause.Length;
                parameterizedClause = parameterizedClause.Remove(replaceStart, p.Value.Length)
                                                         .Insert(replaceStart, $"@param{i}");
                int lenAfter = parameterizedClause.Length;
                shift += lenAfter - lenBefore;
                i++;
            }
            clause = parameterizedClause;
        }

        [GeneratedRegex("{{[^}]+}}")]
        private static partial Regex HandlebarsPlaceholder();
    }
}
