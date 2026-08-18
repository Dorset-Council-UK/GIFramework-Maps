using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Search;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using MockQueryable.Moq;
using Moq;
using Moq.Protected;
using NUnit.Framework;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Tests
{
	internal class SearchRepositoryTests : DbContextBaseTest
	{
        private SearchRepository sut;

        [SetUp]
        public void Setup()
        {
            var mockLogger = new Mock<ILogger<SearchRepository>>();
			var mockIApplicationDbContext = SetupMockIApplicationDbContext();

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

            // TODO: Add some parameters to the mockMemoryCache?
            var mockMemoryCache = new MemoryCache(new MemoryCacheOptions());

            sut = new SearchRepository(mockLogger.Object, mockIApplicationDbContext.Object, mockFactory.Object, mockHttpContextAccessor.Object, mockMemoryCache);
        }

        [Test]
        [TestCase(1, ExpectedResult = 2)]
        [TestCase(8, ExpectedResult = 1)]
        [TestCase(9, ExpectedResult = 2)]
        public async Task<int> GetSearchDefinitionsByVersion_ValidVersion(int versionId)
        {
            var searchDefs = await sut.GetSearchDefinitionsByVersion(versionId);

            return searchDefs.Count;
        }

        [Test]
        [TestCase(9, ExpectedResult = 2)]
        public async Task<int> GetSearchDefinitionsByVersion_ValidVersion_DefaultConfig(int versionId)
        {
            var searchDefs = await sut.GetSearchDefinitionsByVersion(versionId);

            return searchDefs.Count;
        }

        [Test]
        [TestCase(99)]
        [TestCase(0)]
        public void GetSearchDefinitionsByVersion_InvalidVersion(int versionId)
        {
            Assert.ThrowsAsync<KeyNotFoundException>(async () => await sut.GetSearchDefinitionsByVersion(versionId) );
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
            decimal[] expectedBbox = [358385.0m, 88725.0m, 359113.0m, 89225.0m];

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
            decimal[] expectedBbox = [358385.0m, 88725.0m, 359113.0m, 89225.0m];

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

            Assert.Throws<InvalidOperationException>(() => SearchRepository.GetResultsFromJSONString(testJSONResult, searchDefinition));

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

            int[] returnedCoords = [decimal.ToInt32(results[0].X), decimal.ToInt32(results[0].Y)];
            return returnedCoords;
        }

        [Test]
        [TestCase("astring")]
        [TestCase("700001,1999999")]
        public void LocalSearch_BNG12Figure_Invalid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "BNG12Figure" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            Assert.That(results.Count, Is.EqualTo(0));

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

            int[] returnedCoords = [decimal.ToInt32(results[0].X), decimal.ToInt32(results[0].Y)];
            return returnedCoords;
        }

        [Test]
        [TestCase("astring")]
        [TestCase("XX0099")]
        public void LocalSearch_BNGAlphaNumeric_Invalid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "BNGAlphaNumeric" };

            Assert.Throws<ArgumentOutOfRangeException>(() => SearchRepository.LocalSearch(searchTerm, searchDefinition));
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

            decimal[] returnedCoords = [results[0].X, results[0].Y];
            return returnedCoords;
        }

        [Test]
        [TestCase("astring")]
        [TestCase("181,181")]
        public void LocalSearch_LatLonDecimal_Invalid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "LatLonDecimal" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

			Assert.That(results.Count, Is.EqualTo(0));
		}

        [Test]
        [TestCase("50° 39′ 41.8″ N 2° 36′ 22.0″ W", ExpectedResult = new double[] { -2.60611, 50.66161 })]
        [TestCase("50°39′41.8″N 144° 53 32.56767", ExpectedResult = new double[] { 144.89238 , 50.66161 })]
        [TestCase("50 39 41.8S 37 50 43", ExpectedResult = new double[] { 37.84528, -50.66161 })]
        [TestCase("50° 39′ 41.8″ N, 2° 36′ 22.0″ W", ExpectedResult = new double[] { -2.60611, 50.66161 })]             // Comma-separated
        [TestCase("50 39 41.8 37 50 43", ExpectedResult = new double[] { 37.84528, 50.66161 })]                           // No hemispheres
        [TestCase("50° 39.697′ N 2° 36.367′ W", ExpectedResult = new double[] { -2.60612, 50.66162 })]                    // DDM format
        [TestCase("50:39:41.8N 2:36:22.0W", ExpectedResult = new double[] { -2.60611, 50.66161 })]                        // Colon-separated
        [TestCase("N50°39′41.8″ W2°36′22.0″", ExpectedResult = new double[] { -2.60611, 50.66161 })]                     // Hemisphere prefix
        public decimal[] LocalSearch_LatLonDMS_Valid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "LatLonDMS" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            decimal[] returnedCoords = [results[0].X, results[0].Y];
            return returnedCoords;
        }

        [Test]
        [TestCase("astring")]
        [TestCase("181,181")]
        public void LocalSearch_LatLonDMS_Invalid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "LatLonDMS" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            Assert.That(results.Count, Is.EqualTo(0));
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

            decimal[] returnedCoords = [results[0].X, results[0].Y];
            return returnedCoords;
        }

        [Test]
        [TestCase("astring")]
        [TestCase("-999999999, 99999999")]
        public void LocalSearch_SphericalMercator_Invalid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "SphericalMercator" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            Assert.That(results.Count, Is.EqualTo(0));

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

            decimal[] returnedCoords = [results[0].X, results[0].Y];
            return returnedCoords;
        }

        [Test]
        [TestCase("astring")]
        [TestCase("ZZZZZZZZ+99")]
        public void LocalSearch_PlusCode_Invalid(string searchTerm)
        {
            LocalSearchDefinition searchDefinition = new() { LocalSearchName = "PlusCode" };

            var results = SearchRepository.LocalSearch(searchTerm, searchDefinition);

            Assert.That(results.Count, Is.EqualTo(0));
        }

        [Test(Description = "Tests that a search term containing special characters (e.g. #) is properly URL-encoded in the API request")]
        [TestCase("123 test avenue#", "123%20test%20avenue%23")]
        [TestCase("test&query=1", "test%26query%3D1")]
        [TestCase("test query?", "test%20query%3F")]
        [TestCase("normal search", "normal%20search")]
        public async Task APISearch_SearchTermWithSpecialCharacters_IsProperlyURLEncoded(string searchTerm, string expectedEncodedTerm)
        {
            // Arrange
            const string urlTemplate = "https://api.example.com/search?q={{search}}&format=json";
            const int searchDefId = 42;
            string? capturedUri = null;

            var mockLogger = new Mock<ILogger<SearchRepository>>();
            var mockIApplicationDbContext = new Mock<IApplicationDbContext>();

            // Set up APISearchDefinition with a URL template containing the {{search}} placeholder
            var apiSearchDef = new APISearchDefinition
            {
                Id = searchDefId,
                Name = "Test API Search",
                Title = "Test Addresses",
                URLTemplate = urlTemplate,
                TitleFieldPath = "$.display_name",
                XFieldPath = "$.lon",
                YFieldPath = "$.lat",
                EPSG = 4326,
                ZoomLevel = 15,
                MaxResults = 10
            };
            var apiSearchDefsMockSet = new List<APISearchDefinition> { apiSearchDef }.BuildMockDbSet();
            mockIApplicationDbContext.Setup(m => m.APISearchDefinitions).Returns(apiSearchDefsMockSet.Object);

            // Set up empty DatabaseSearchDefinitions and LocalSearchDefinitions
            mockIApplicationDbContext.Setup(m => m.DatabaseSearchDefinitions)
                .Returns(new List<DatabaseSearchDefinition>().BuildMockDbSet().Object);
            mockIApplicationDbContext.Setup(m => m.LocalSearchDefinitions)
                .Returns(new List<LocalSearchDefinition>().BuildMockDbSet().Object);

            // Set up VersionSearchDefinitions pointing to the API search definition
            var versionSearchDef = new VersionSearchDefinition
            {
                SearchDefinitionId = searchDefId,
                SearchDefinition = apiSearchDef
            };
            mockIApplicationDbContext.Setup(m => m.VersionSearchDefinitions)
                .Returns(new List<VersionSearchDefinition> { versionSearchDef }.BuildMockDbSet().Object);

            // Set up HTTP mock that captures the request URI
            var mockHttpMessageHandler = new Mock<HttpMessageHandler>();
            mockHttpMessageHandler.Protected()
                .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
                .Callback<HttpRequestMessage, CancellationToken>((req, _) => capturedUri = req.RequestUri?.AbsoluteUri)
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent("[]"),
                });

            var mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
            mockHttpContextAccessor.Setup(_ => _.HttpContext).Returns(new DefaultHttpContext());

            var mockFactory = new Mock<IHttpClientFactory>();
            mockFactory.Setup(_ => _.CreateClient(It.IsAny<string>())).Returns(new HttpClient(mockHttpMessageHandler.Object));

            var repository = new SearchRepository(
                mockLogger.Object,
                mockIApplicationDbContext.Object,
                mockFactory.Object,
                mockHttpContextAccessor.Object,
                new MemoryCache(new MemoryCacheOptions()));

            var requiredSearches = new List<RequiredSearch>
            {
                new() { SearchDefinitionId = searchDefId, Enabled = true, Order = 1 }
            };

            // Act
            await repository.Search(searchTerm, requiredSearches);

            // Assert
            Assert.That(capturedUri, Is.Not.Null, "Expected an HTTP request to be made");
            Assert.That(capturedUri, Does.Contain(expectedEncodedTerm), $"Expected encoded term '{expectedEncodedTerm}' in URI");
            Assert.That(capturedUri, Does.Not.Contain("#"), "URI must not contain an unencoded '#' character");
        }

        [Test(Description = "When the search term is shorter than the search definition's effective minimum length, the search definition should be skipped entirely and produce no results")]
        public async Task Search_TermShorterThanMinLength_SkipsSearchDefinition()
        {
            const int searchDefId = 55;

            var mockLogger = new Mock<ILogger<SearchRepository>>();
            var mockIApplicationDbContext = new Mock<IApplicationDbContext>();

            var localSearchDef = new LocalSearchDefinition
            {
                Id = searchDefId,
                Name = "BNG12Figure",
                LocalSearchName = "BNG12Figure",
                Title = "Long Minimum Search",
                MinSearchTextLength = 50
            };

            mockIApplicationDbContext.Setup(m => m.APISearchDefinitions)
                .Returns(new List<APISearchDefinition>().BuildMockDbSet().Object);
            mockIApplicationDbContext.Setup(m => m.DatabaseSearchDefinitions)
                .Returns(new List<DatabaseSearchDefinition>().BuildMockDbSet().Object);
            mockIApplicationDbContext.Setup(m => m.LocalSearchDefinitions)
                .Returns(new List<LocalSearchDefinition> { localSearchDef }.BuildMockDbSet().Object);

            var versionSearchDef = new VersionSearchDefinition
            {
                SearchDefinitionId = searchDefId,
                SearchDefinition = localSearchDef
            };
            mockIApplicationDbContext.Setup(m => m.VersionSearchDefinitions)
                .Returns(new List<VersionSearchDefinition> { versionSearchDef }.BuildMockDbSet().Object);

            var mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
            mockHttpContextAccessor.Setup(_ => _.HttpContext).Returns(new DefaultHttpContext());
            var mockFactory = new Mock<IHttpClientFactory>();

            var repository = new SearchRepository(
                mockLogger.Object,
                mockIApplicationDbContext.Object,
                mockFactory.Object,
                mockHttpContextAccessor.Object,
                new MemoryCache(new MemoryCacheOptions()));

            var requiredSearches = new List<RequiredSearch>
            {
                new() { SearchDefinitionId = searchDefId, Enabled = true, Order = 1 }
            };

            // Act - the search term ("abc") is shorter than the definition's MinSearchTextLength (50)
            var results = await repository.Search("abc", requiredSearches);

            // Assert
            Assert.That(results.ResultCategories, Is.Empty, "No categories should be produced when the term is below the minimum length");
            Assert.That(results.TotalResults, Is.EqualTo(0));
            Assert.That(results.IsError, Is.False);
        }

		[Test(Description = "When the search term is longer than the search definition's effective maximum length, the search term should be truncated")]
		public async Task Search_TermLongerThanMaxLength_TruncatesSearchTerm()
		{
			const int searchDefId = 55;

			var mockLogger = new Mock<ILogger<SearchRepository>>();
			var mockIApplicationDbContext = new Mock<IApplicationDbContext>();

			var localSearchDef = new LocalSearchDefinition
			{
				Id = searchDefId,
				Name = "BNG12Figure",
				LocalSearchName = "BNG12Figure",
				Title = "Short Maximum Search",
				MaxSearchTextLength = 13
			};

			mockIApplicationDbContext.Setup(m => m.APISearchDefinitions)
				.Returns(new List<APISearchDefinition>().BuildMockDbSet().Object);
			mockIApplicationDbContext.Setup(m => m.DatabaseSearchDefinitions)
				.Returns(new List<DatabaseSearchDefinition>().BuildMockDbSet().Object);
			mockIApplicationDbContext.Setup(m => m.LocalSearchDefinitions)
				.Returns(new List<LocalSearchDefinition> { localSearchDef }.BuildMockDbSet().Object);

			var versionSearchDef = new VersionSearchDefinition
			{
				SearchDefinitionId = searchDefId,
				SearchDefinition = localSearchDef
			};
			mockIApplicationDbContext.Setup(m => m.VersionSearchDefinitions)
				.Returns(new List<VersionSearchDefinition> { versionSearchDef }.BuildMockDbSet().Object);

			var mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
			mockHttpContextAccessor.Setup(_ => _.HttpContext).Returns(new DefaultHttpContext());
			var mockFactory = new Mock<IHttpClientFactory>();

			var repository = new SearchRepository(
				mockLogger.Object,
				mockIApplicationDbContext.Object,
				mockFactory.Object,
				mockHttpContextAccessor.Object,
				new MemoryCache(new MemoryCacheOptions()));

			var requiredSearches = new List<RequiredSearch>
			{
				new() { SearchDefinitionId = searchDefId, Enabled = true, Order = 1 }
			};

			// Act - the search term ("366646 101677z") is longer than the definition's MaxSearchTextLength (13)
			// This is a bit of a hack of a test. By making the search term longer than the max length, we are testing that the search term is truncated to 13 characters.
			// The LocalSearch method will then process the truncated term ("366646 101677") and produce a result.
			var results = await repository.Search("366646 101677z", requiredSearches);

			// Assert
			
			Assert.That(results.ResultCategories, Has.Exactly(1).Items);
			Assert.That(results.TotalResults, Is.EqualTo(1));
			Assert.That(results.IsError, Is.False);
		}

		[Test(Description = "When a search definition produces results and StopIfFound is set, subsequent enabled search definitions should not be processed")]
        public async Task Search_StopIfFoundSetAndResultsFound_StopsProcessingFurtherDefinitions()
        {
            const int firstSearchDefId = 61;
            const int secondSearchDefId = 62;

            var mockLogger = new Mock<ILogger<SearchRepository>>();
            var mockIApplicationDbContext = new Mock<IApplicationDbContext>();

            var firstLocalSearchDef = new LocalSearchDefinition
            {
                Id = firstSearchDefId,
                Name = "BNG12Figure",
                LocalSearchName = "BNG12Figure",
                Title = "BNG 12 Figure"
            };

            var secondLocalSearchDef = new LocalSearchDefinition
            {
                Id = secondSearchDefId,
                Name = "BNG12Figure",
                LocalSearchName = "BNG12Figure",
                Title = "Should Not Run"
            };

            mockIApplicationDbContext.Setup(m => m.APISearchDefinitions)
                .Returns(new List<APISearchDefinition>().BuildMockDbSet().Object);
            mockIApplicationDbContext.Setup(m => m.DatabaseSearchDefinitions)
                .Returns(new List<DatabaseSearchDefinition>().BuildMockDbSet().Object);
            mockIApplicationDbContext.Setup(m => m.LocalSearchDefinitions)
                .Returns(new List<LocalSearchDefinition> { firstLocalSearchDef, secondLocalSearchDef }.BuildMockDbSet().Object);

            var versionSearchDefs = new List<VersionSearchDefinition>
            {
                new() { SearchDefinitionId = firstSearchDefId, SearchDefinition = firstLocalSearchDef },
                new() { SearchDefinitionId = secondSearchDefId, SearchDefinition = secondLocalSearchDef }
            };
            mockIApplicationDbContext.Setup(m => m.VersionSearchDefinitions)
                .Returns(versionSearchDefs.BuildMockDbSet().Object);

            var mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
            mockHttpContextAccessor.Setup(_ => _.HttpContext).Returns(new DefaultHttpContext());
            var mockFactory = new Mock<IHttpClientFactory>();

            var repository = new SearchRepository(
                mockLogger.Object,
                mockIApplicationDbContext.Object,
                mockFactory.Object,
                mockHttpContextAccessor.Object,
                new MemoryCache(new MemoryCacheOptions()));

            var requiredSearches = new List<RequiredSearch>
            {
                new() { SearchDefinitionId = firstSearchDefId, Enabled = true, Order = 1, StopIfFound = true },
                new() { SearchDefinitionId = secondSearchDefId, Enabled = true, Order = 2, StopIfFound = false }
            };

            // Act - a valid 12-figure BNG grid reference produces a result for the first definition
            var results = await repository.Search("366646 101677", requiredSearches);

            // Assert
            Assert.That(results.ResultCategories, Has.Exactly(1).Items, "Only the first search definition should have produced a result category");
            Assert.That(results.ResultCategories[0].CategoryName, Is.EqualTo("BNG 12 Figure"));
            Assert.That(results.TotalResults, Is.GreaterThan(0));
        }

        [Test(Description = "When executing a single search throws an exception, the error flag should be set on the results but the method should not throw")]
        public async Task Search_ExceptionThrownDuringSingleSearch_SetsIsErrorFlag()
        {
            const int searchDefId = 71;

            var mockLogger = new Mock<ILogger<SearchRepository>>();
            var mockIApplicationDbContext = new Mock<IApplicationDbContext>();

            var searchDefinition = new LocalSearchDefinition
            {
                Id = searchDefId,
                Name = "BNG12Figure",
                LocalSearchName = "BNG12Figure",
                Title = "Erroring Search"
            };

            mockIApplicationDbContext.Setup(m => m.APISearchDefinitions)
                .Returns(new List<APISearchDefinition>().BuildMockDbSet().Object);
            mockIApplicationDbContext.Setup(m => m.DatabaseSearchDefinitions)
                .Returns(new List<DatabaseSearchDefinition>().BuildMockDbSet().Object);
            // Deliberately do NOT set up LocalSearchDefinitions so that accessing it inside
            // SingleSearch throws a NullReferenceException, which should be caught and
            // recorded via the IsError flag rather than bubbling out of Search().
            mockIApplicationDbContext.Setup(m => m.LocalSearchDefinitions)
                .Returns(default(Microsoft.EntityFrameworkCore.DbSet<LocalSearchDefinition>));

            var versionSearchDef = new VersionSearchDefinition
            {
                SearchDefinitionId = searchDefId,
                SearchDefinition = searchDefinition
            };
            mockIApplicationDbContext.Setup(m => m.VersionSearchDefinitions)
                .Returns(new List<VersionSearchDefinition> { versionSearchDef }.BuildMockDbSet().Object);

            var mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
            mockHttpContextAccessor.Setup(_ => _.HttpContext).Returns(new DefaultHttpContext());
            var mockFactory = new Mock<IHttpClientFactory>();

            var repository = new SearchRepository(
                mockLogger.Object,
                mockIApplicationDbContext.Object,
                mockFactory.Object,
                mockHttpContextAccessor.Object,
                new MemoryCache(new MemoryCacheOptions()));

            var requiredSearches = new List<RequiredSearch>
            {
                new() { SearchDefinitionId = searchDefId, Enabled = true, Order = 1 }
            };

            // Act
            var results = await repository.Search("366646 101677", requiredSearches);

            // Assert
            Assert.That(results.IsError, Is.True, "The IsError flag should be set when a single search throws an exception");
            Assert.That(results.ResultCategories, Is.Empty, "No results should be added for the definition that threw");
        }
    }
}
