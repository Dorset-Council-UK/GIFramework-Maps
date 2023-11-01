using NUnit.Framework;
using Moq;
using GIFrameworkMaps.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using GIFrameworkMaps.Data.Models;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using Moq.Protected;
using System.Threading.Tasks;
using System.Threading;
using System.Net;
using Microsoft.AspNetCore.Http;
using GIFrameworkMaps.Data.Models.Search;
using System.IO;
using Microsoft.Extensions.Caching.Memory;
using MockQueryable.Moq;
using System;

namespace GIFrameworkMaps.Tests
{
    public class SearchRepositoryTests
    {
        private ILogger<SearchRepository> _logger;
        private SearchRepository sut;

        [OneTimeSetUp]
        public void OneTimeSetup()
        {
            //This OneTimeSetup creates a mock dataset. It is assumed this dataset will NOT be modified by test code.
            //If this assumption changes, the data should be moved into a [SetUp] method to maintain consistency
            var serviceProvider = new ServiceCollection()
               .AddLogging()
               .BuildServiceProvider();

            //Mock ILogger
            var factory = serviceProvider.GetService<ILoggerFactory>();
            _logger = factory.CreateLogger<SearchRepository>();

            //mock IHttpClientFactory
            var mockFactory = new Mock<IHttpClientFactory>();
            var mockHttpMessageHandler = new Mock<HttpMessageHandler>();
            mockHttpMessageHandler.Protected()
                .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent("{'name':'mock'}"),
                });

            //Mock IHttpContextAccessor
            var mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
            var context = new DefaultHttpContext();
            mockHttpContextAccessor.Setup(_ => _.HttpContext).Returns(context);

            var client = new HttpClient(mockHttpMessageHandler.Object);
            mockFactory.Setup(_ => _.CreateClient(It.IsAny<string>())).Returns(client);


            var versions = new List<Data.Models.Version>
            {
                new Data.Models.Version { Name = "General version",Slug= "general",Id=1 },
                new Data.Models.Version { Name = "Custom Search Defs",Slug= "custom/searchdefs",Id=2 },
                new Data.Models.Version { Name = "Default Search Defs",Slug= "default/searchdefs",Id=3 }
            };

            var searchDefs = new List<SearchDefinition>
            {
                new LocalSearchDefinition{Name = "Coordinates - BNG 12 Figure", Title="British National Grid Coordinates"},
                new APISearchDefinition{Name = "OS Places API", Title ="Addresses"}
            };

            var versionSearchDefs = new List<VersionSearchDefinition>
            {
                new VersionSearchDefinition{Version = versions[0], SearchDefinition = searchDefs[0],Enabled = true, VersionId = versions[0].Id},
                new VersionSearchDefinition{Version = versions[0], SearchDefinition = searchDefs[1],Enabled = true, VersionId = versions[0].Id},
                new VersionSearchDefinition{Version = versions[1], SearchDefinition = searchDefs[1],Enabled = true, VersionId = versions[1].Id}
            };

            var versionsMockSet = versions.AsQueryable().BuildMockDbSet();
            var searchDefsMockSet = searchDefs.AsQueryable().BuildMockDbSet();
            var versionSearchDefsMockSet = versionSearchDefs.AsQueryable().BuildMockDbSet();

            var mockApplicationDbContext = new Mock<IApplicationDbContext>();
            mockApplicationDbContext.Setup(m => m.Versions).Returns(versionsMockSet.Object);
            mockApplicationDbContext.Setup(m => m.SearchDefinitions).Returns(searchDefsMockSet.Object);
            mockApplicationDbContext.Setup(m => m.VersionSearchDefinition).Returns(versionSearchDefsMockSet.Object);

            var mockMemoryCache = new MemoryCache(new MemoryCacheOptions()); ;
            /* TO DO: Add some parameters to the mockMemoryCache? */
            sut = new SearchRepository(_logger, mockApplicationDbContext.Object, mockFactory.Object, mockHttpContextAccessor.Object, mockMemoryCache);
        }

        [Test]
        [TestCase(1, ExpectedResult = 2)]
        [TestCase(2, ExpectedResult = 1)]
        [TestCase(3, ExpectedResult = 2)]
        public int GetSearchDefinitionsByVersion_ValidVersion(int versionId)
        {
            var searchDefs = sut.GetSearchDefinitionsByVersion(versionId);

            return searchDefs.Count;
        }

        [Test]
        [TestCase(3, ExpectedResult = 2)]
        public int GetSearchDefinitionsByVersion_ValidVersion_DefaultConfig(int versionId)
        {
            var searchDefs = sut.GetSearchDefinitionsByVersion(versionId);

            return searchDefs.Count;
        }

        [Test]
        [TestCase(4)]
        [TestCase(0)]
        public void GetSearchDefinitionsByVersion_InvalidVersion(int versionId)
        {

            Assert.Throws<KeyNotFoundException>(delegate { sut.GetSearchDefinitionsByVersion(versionId); });
        }

        [Test(Description = "Gets a valid address-like JSON result and tests extracting the results, expecting a valid x and y and a properly formatted title")]
        public void GetResultsFromJSON_Addresses_SingleTitle_ValidJSON()
        {
            APISearchDefinition searchDefinition = new() { Name = "Example Address API", Title = "Addresses", MaxResults = 100, ZoomLevel = 19, EPSG = 27700, SupressGeom = false, XFieldPath = "$.results[*].DPA.X_COORDINATE", YFieldPath = "$.results[*].DPA.Y_COORDINATE", TitleFieldPath = "$.results[*].DPA.ADDRESS" };
            string testJSONResult = File.ReadAllText("Data/addresses.json");

            var results = SearchRepository.GetResultsFromJSONString(testJSONResult, searchDefinition);

            Assert.That(results, Has.Exactly(5).Items);

            Assert.That(results, Has.Exactly(1)
                .Matches<SearchResult>(
                result => result.DisplayText == "1, EXAMPLE ROAD, EXAMPLE LOCALITY, EXAMPLE TOWN, AA1 1AA" &&
                result.X == 361709.81m &&
                result.Y == 90515.67m));

        }

        [Test(Description = "Gets a valid address-like JSON result and tests extracting the results, using a compound title with two attributes, expecting a valid x and y and a properly formatted title")]
        public void GetResultsFromJSON_Addresses_CompoundTitle_ValidJSON()
        {
            APISearchDefinition searchDefinition = new() { Name = "Example Address API", Title = "Addresses", MaxResults = 100, ZoomLevel = 19, EPSG = 27700, SupressGeom = false, XFieldPath = "$.results[*].DPA.X_COORDINATE", YFieldPath = "$.results[*].DPA.Y_COORDINATE", TitleFieldPath = "{{$.results[*].DPA.ADDRESS}} (UPRN: {{$.results[*].DPA.UPRN}})" };
            string testJSONResult = File.ReadAllText("Data/addresses.json");

            var results = SearchRepository.GetResultsFromJSONString(testJSONResult, searchDefinition);

            Assert.That(results, Has.Exactly(5).Items);

            Assert.That(results, Has.Exactly(1)
                .Matches<SearchResult>(
                result => result.DisplayText == "1, EXAMPLE ROAD, EXAMPLE LOCALITY, EXAMPLE TOWN, AA1 1AA (UPRN: 10000000001)" &&
                result.X == 361709.81m &&
                result.Y == 90515.67m));

        }

        [Test(Description = "Gets a valid address-like JSON result and tests extracting the results, using a compound title formatting with a single attribute, expecting a valid x and y and a properly formatted title")]
        public void GetResultsFromJSON_Addresses_SingleCompoundTitle_ValidJSON()
        {
            APISearchDefinition searchDefinition = new() { Name = "Example Address API", Title = "Addresses", MaxResults = 100, ZoomLevel = 19, EPSG = 27700, SupressGeom = false, XFieldPath = "$.results[*].DPA.X_COORDINATE", YFieldPath = "$.results[*].DPA.Y_COORDINATE", TitleFieldPath = "{{$.results[*].DPA.ADDRESS}}" };
            string testJSONResult = File.ReadAllText("Data/addresses.json");

            var results = SearchRepository.GetResultsFromJSONString(testJSONResult, searchDefinition);

            Assert.That(results, Has.Exactly(5).Items);

            Assert.That(results, Has.Exactly(1)
                .Matches<SearchResult>(
                result => result.DisplayText == "1, EXAMPLE ROAD, EXAMPLE LOCALITY, EXAMPLE TOWN, AA1 1AA" &&
                result.X == 361709.81m &&
                result.Y == 90515.67m));

        }

        [Test(Description = "Gets a valid places-like JSON result and tests extracting the results, expecting a valid BBOX and properly formatted display text")]
        public void GetResultsFromJSON_Places_SingleTitle_ValidJSON()
        {
            APISearchDefinition searchDefinition = new() { Name = "Example Places API", Title = "Addresses", MaxResults = 50, ZoomLevel = 15, EPSG = 27700, SupressGeom = true, MBRXMaxPath = "$.results[*].GAZETTEER_ENTRY.MBR_XMAX", MBRXMinPath = "$.results[*].GAZETTEER_ENTRY.MBR_XMIN", MBRYMaxPath = "$.results[*].GAZETTEER_ENTRY.MBR_YMAX", MBRYMinPath = "$.results[*].GAZETTEER_ENTRY.MBR_YMIN" ,TitleFieldPath= "$.results[*].GAZETTEER_ENTRY.NAME1" };
            string testJSONResult = File.ReadAllText("Data/places.json");

            var results = SearchRepository.GetResultsFromJSONString(testJSONResult, searchDefinition);
            decimal[] expectedBbox = { 358385.0m, 88725.0m, 359113.0m, 89225.0m};

            Assert.That(results, Has.Exactly(1).Items);

            Assert.That(results, Has.Exactly(1)
               .Matches<SearchResult>(
               result => result.DisplayText == "Example"));

            /*NOTE: Could not merge this test into the lambda test above (would not match)*/
            Assert.That(results[0].Bbox, Is.EqualTo(expectedBbox));

        }

        [Test(Description = "Gets a valid places-like JSON result and tests extracting the results, using a compound title with two attributes, expecting a valid BBOX and a properly formatted title")]
        public void GetResultsFromJSON_Places_CompoundTitle_ValidJSON()
        {
            APISearchDefinition searchDefinition = new() { Name = "Example Places API", Title = "Addresses", MaxResults = 50, ZoomLevel = 15, EPSG = 27700, SupressGeom = true, MBRXMaxPath = "$.results[*].GAZETTEER_ENTRY.MBR_XMAX", MBRXMinPath = "$.results[*].GAZETTEER_ENTRY.MBR_XMIN", MBRYMaxPath = "$.results[*].GAZETTEER_ENTRY.MBR_YMAX", MBRYMinPath = "$.results[*].GAZETTEER_ENTRY.MBR_YMIN", TitleFieldPath = "{{$.results[*].GAZETTEER_ENTRY.NAME1}} ({{$.results[*].GAZETTEER_ENTRY.COUNTY_UNITARY}})" };
            string testJSONResult = File.ReadAllText("Data/places.json");

            var results = SearchRepository.GetResultsFromJSONString(testJSONResult, searchDefinition);
            decimal[] expectedBbox = { 358385.0m, 88725.0m, 359113.0m, 89225.0m };

            Assert.That(results, Has.Exactly(1).Items);

            Assert.That(results, Has.Exactly(1)
               .Matches<SearchResult>(
               result => result.DisplayText == "Example (Example County)"));

            /*NOTE: Could not merge this test into the lambda test above (would not match)*/
            Assert.That(results[0].Bbox, Is.EqualTo(expectedBbox));

        }

        [Test(Description = "Attempts to fetch an address using a search definition that doesn't have a title")]
        public void GetResultsFromJSON_Addresses_NoTitle_ShouldThrow()
        {
            APISearchDefinition searchDefinition = new() { Name = "Example Address API", Title = "Addresses", MaxResults = 100, ZoomLevel = 19, EPSG = 27700, SupressGeom = false, XFieldPath = "$.results[*].DPA.X_COORDINATE", YFieldPath = "$.results[*].DPA.Y_COORDINATE" };
            string testJSONResult = File.ReadAllText("Data/addresses.json");

            Assert.Throws<InvalidOperationException>(delegate { SearchRepository.GetResultsFromJSONString(testJSONResult, searchDefinition); });

        }

        [Test]
        [TestCase("366646 101677",ExpectedResult = new int[] { 366_646, 101_677 })]
        [TestCase("366646,101677", ExpectedResult = new int[] { 366_646, 101_677 })]
        [TestCase("366646    ,     101677", ExpectedResult = new int[] { 366_646, 101_677 })]
        [TestCase("700000 1300000", ExpectedResult = new int[] { 700_000, 1_300_000 })]
        [TestCase("1, 1", ExpectedResult = new int[] { 1, 1 })]
        [TestCase("0, 0", ExpectedResult = new int[] { 0, 0 })]
        public int[] LocalSearch_BNG12Figure(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "BNG12Figure" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            int[] returnedCoords = { decimal.ToInt32(results[0].X), decimal.ToInt32(results[0].Y) };
            return returnedCoords;
        }

        [Test]
        [TestCase("astring")]
        [TestCase("700001,1999999")]
        public void LocalSearch_BNG12Figure_Invalid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "BNG12Figure" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            Assert.AreEqual(results.Count, 0);

        }

        [Test]
        [TestCase("SY6773568359", ExpectedResult = new int[] { 367_735, 68_359 })]
        [TestCase("sy 677 683", ExpectedResult = new int[] { 367_700, 68_300 })]
        [TestCase("SV00", ExpectedResult = new int[] { 0, 0 })]
        [TestCase("HP9999999999", ExpectedResult = new int[] { 499_999, 1_299_999 })]
        [TestCase("TM 99 99 99 99", ExpectedResult = new int[] { 699990, 299990 })]
        public int[] LocalSearch_BNGAlphaNumeric_Valid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "BNGAlphaNumeric" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);


            int[] returnedCoords = { decimal.ToInt32(results[0].X), decimal.ToInt32(results[0].Y) };
            return returnedCoords;
        }

        [Test]
        [TestCase("astring")]
        [TestCase("XX0099")]
        public void LocalSearch_BNGAlphaNumeric_Invalid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "BNGAlphaNumeric" };

            Assert.Throws<System.ArgumentOutOfRangeException>(delegate { SearchRepository.LocalSearch(searchTerm, searchDefinition); });
        }

        [Test]
        [TestCase("50.6181 -2.2468", ExpectedResult = new double[] { -2.2468, 50.6181 })]
        [TestCase("-180, -180", ExpectedResult = new double[] { -180, -180 })]
        [TestCase("180      ,      180", ExpectedResult = new double[] { 180, 180 })]
        [TestCase("0,0", ExpectedResult = new double[] { 0, 0 })]
        [TestCase("-179.999       179.999", ExpectedResult = new double[] { 179.999, -179.999 })]
        [TestCase("179.999, -179.999", ExpectedResult = new double[] { -179.999, 179.999 })]
        public decimal[] LocalSearch_LatLonDecimal_Valid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "LatLonDecimal" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            decimal[] returnedCoords = { results[0].X, results[0].Y };
            return returnedCoords;
        }


        [Test]
        [TestCase("astring")]
        [TestCase("181,181")]
        public void LocalSearch_LatLonDecimal_Invalid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "LatLonDecimal" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            Assert.AreEqual(results.Count, 0);
        }

        [Test]
        [TestCase("50° 39′ 41.8″ N 2° 36′ 22.0″ W", ExpectedResult = new double[] { -2.60611, 50.66161 })]
        [TestCase("50°39′41.8″N 144° 53 32.56767", ExpectedResult = new double[] { 144.89238 , 50.66161 })]
        [TestCase("50 39 41.8S 37 50 43", ExpectedResult = new double[] { 37.84528, -50.66161 })]
        public decimal[] LocalSearch_LatLonDMS_Valid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "LatLonDMS" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            decimal[] returnedCoords = { results[0].X, results[0].Y };
            return returnedCoords;
        }

        [Test]
        [TestCase("astring")]
        [TestCase("181,181")]
        public void LocalSearch_LatLonDMS_Invalid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "LatLonDMS" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            Assert.AreEqual(results.Count, 0);
        }

        [Test]
        [TestCase("-244610.29377, 6622151.15931", ExpectedResult = new double[] { -244610.29377, 6622151.15931 })]
        [TestCase("-20026376.39 -20048966.10", ExpectedResult = new double[] { -20026376.39, -20048966.10 })]
        [TestCase("20026376.39      ,      20048966.10", ExpectedResult = new double[] { 20026376.39, 20048966.10 })]
        [TestCase("0 , 0", ExpectedResult = new double[] { 0, 0 })]
        public decimal[] LocalSearch_SphericalMercator_Valid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "SphericalMercator" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            decimal[] returnedCoords = { results[0].X, results[0].Y };
            return returnedCoords;
        }

        [Test]
        [TestCase("astring")]
        [TestCase("-999999999, 99999999")]
        public void LocalSearch_SphericalMercator_Invalid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "SphericalMercator" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            Assert.AreEqual(results.Count, 0);

        }

        [Test]
        [TestCase("9C2VMCX8+73", ExpectedResult = new double[] { -2.5848125, 50.6981875 })]
        [TestCase("9C2VQCHJ+55", ExpectedResult = new double[] { -2.5695625, 50.7779375 })]
        [TestCase("9fvmW4R6+7m", ExpectedResult = new double[] { 13.1116875, 67.9406875 })]
        [TestCase("39Q5PF9R+GV", ExpectedResult = new double[] { -36.5078125, -54.2811875 })]
        public decimal[] LocalSearch_PlusCode(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "PlusCode" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            decimal[] returnedCoords = { results[0].X, results[0].Y };
            return returnedCoords;
        }

        [Test]
        [TestCase("astring")]
        [TestCase("ZZZZZZZZ+99")]
        public void LocalSearch_PlusCode_Invalid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "PlusCode" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            Assert.AreEqual(results.Count, 0);
        }

    }
}
