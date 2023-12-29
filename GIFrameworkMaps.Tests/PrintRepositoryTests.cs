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
	public class PrintRepositoryTests
    {
        private PrintRepository sut;

        [OneTimeSetUp]
        public void OneTimeSetup()
        {
            //This OneTimeSetup creates a mock dataset. It is assumed this dataset will NOT be modified by test code.
            //If this assumption changes, the data should be moved into a [SetUp] method to maintain consistency
            var serviceProvider = new ServiceCollection()
               .AddLogging()
               .BuildServiceProvider();

            var factory = serviceProvider.GetService<ILoggerFactory>();

            var versions = new List<Version>
            {
                new Version { Name = "General version",Slug= "general",Id=1 },
                new Version { Name = "Alternative Print Config",Slug= "alt/config",Id=2 },
                new Version { Name = "Null Print Config",Slug= "null/config",Id=3 }
            };

            var printConfigs = new List<PrintConfiguration> {
                new PrintConfiguration { Name = "Default",Id = 1},
                new PrintConfiguration { Name = "Alternative",Id = 2},
            };

            var printVersionConfigs = new List<VersionPrintConfiguration>
            {
                new VersionPrintConfiguration { PrintConfigurationId = 1, VersionId=1, PrintConfiguration = printConfigs[0], Version = versions[0] },
                new VersionPrintConfiguration { PrintConfigurationId = 2, VersionId=2, PrintConfiguration = printConfigs[1], Version = versions[1] }
            };

            var versionsMockSet = versions.AsQueryable().BuildMockDbSet();
            var printConfigMockSet = printConfigs.AsQueryable().BuildMockDbSet();
            var printVersionConfigsMockSet = printVersionConfigs.AsQueryable().BuildMockDbSet();
            var mockApplicationDbContext = new Mock<IApplicationDbContext>();
            mockApplicationDbContext.Setup(m => m.Versions).Returns(versionsMockSet.Object);
            mockApplicationDbContext.Setup(m => m.PrintConfigurations).Returns(printConfigMockSet.Object);
            mockApplicationDbContext.Setup(m => m.VersionPrintConfiguration).Returns(printVersionConfigsMockSet.Object);

            var mockMemoryCache = new MemoryCache(new MemoryCacheOptions()); ;
            /* TO DO: Add some parameters to the mockMemoryCache? */

            sut = new PrintRepository(mockApplicationDbContext.Object, mockMemoryCache);
        }

        [SetUp]
        public void Setup()
        {

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
        [TestCase(3, ExpectedResult = 1)]
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
