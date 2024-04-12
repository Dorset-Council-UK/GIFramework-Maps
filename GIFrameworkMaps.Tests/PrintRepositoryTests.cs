using NUnit.Framework;
using Moq;
using GIFrameworkMaps.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using GIFrameworkMaps.Data.Models;
using System.Collections.Generic;
using System.Linq;
using GIFrameworkMaps.Data.Models.Print;
using Microsoft.Extensions.Caching.Memory;
using MockQueryable.Moq;

namespace GIFrameworkMaps.Tests
{
	internal class PrintRepositoryTests : DbContextBaseTest
	{
        private PrintRepository sut;

        [SetUp]
        public void Setup()
        {
			var mockIApplicationDbContext = SetupMockIApplicationDbContext();

			var versions = new List<Version>
            {
                new() { Name = "General version",Slug= "general",Id=1 },
                new() { Name = "Alternative Print Config",Slug= "alt/config",Id=2 },
                new() { Name = "Null Print Config",Slug= "null/config",Id=3 }
            };

            var printConfigs = new List<PrintConfiguration> {
                new() { Name = "Default",Id = 1},
                new() { Name = "Alternative",Id = 2},
            };

            var printVersionConfigs = new List<VersionPrintConfiguration>
            {
                new() { PrintConfigurationId = 1, VersionId=1, PrintConfiguration = printConfigs[0], Version = versions[0] },
                new() { PrintConfigurationId = 2, VersionId=2, PrintConfiguration = printConfigs[1], Version = versions[1] }
            };

            var versionsMockSet = versions.AsQueryable().BuildMockDbSet();
            var printConfigMockSet = printConfigs.AsQueryable().BuildMockDbSet();
            var printVersionConfigsMockSet = printVersionConfigs.AsQueryable().BuildMockDbSet();
            var mockApplicationDbContext = new Mock<IApplicationDbContext>();
            mockApplicationDbContext.Setup(m => m.Versions).Returns(versionsMockSet.Object);
            mockApplicationDbContext.Setup(m => m.PrintConfigurations).Returns(printConfigMockSet.Object);
            mockApplicationDbContext.Setup(m => m.VersionPrintConfigurations).Returns(printVersionConfigsMockSet.Object);

            var mockMemoryCache = new MemoryCache(new MemoryCacheOptions()); ;
            /* TO DO: Add some parameters to the mockMemoryCache? */

            sut = new PrintRepository(mockIApplicationDbContext.Object, mockMemoryCache);
        }

        [Test]
        [TestCase(1, ExpectedResult = "Default")]
        [TestCase(2, ExpectedResult = "Alternative")]
        public string GetPrintConfigurationByVersion_ValidVersion_SpecifiedConfig(int versionId)
        {
            var printConfig = sut.GetPrintConfigurationByVersion(versionId);

            return printConfig.PrintConfiguration.Name;
        }

        [Test]
        [TestCase(1, ExpectedResult = 1)]
		[TestCase(6, ExpectedResult = 2)]
		public int GetPrintConfigurationByVersion_ValidVersion_DefaultConfig(int versionId)
        {
            var printConfig = sut.GetPrintConfigurationByVersion(versionId);

            return printConfig.PrintConfigurationId;
        }

        [Test]
        [TestCase(4)]
        [TestCase(0)]
        public void GetPrintConfigurationByVersion_InvalidVersion(int versionId)
        {

            Assert.Throws<KeyNotFoundException>(delegate { sut.GetPrintConfigurationByVersion(versionId); });
        }
    }
}
