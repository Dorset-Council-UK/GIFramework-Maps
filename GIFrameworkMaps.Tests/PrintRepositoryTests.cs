﻿using GIFrameworkMaps.Data;
using Microsoft.Extensions.Caching.Memory;
using NUnit.Framework;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Tests
{
	internal class PrintRepositoryTests : DbContextBaseTest
	{
        private PrintRepository sut;

        [SetUp]
        public void Setup()
        {
			var mockIApplicationDbContext = SetupMockIApplicationDbContext();

            // TODO: Add some parameters to the mockMemoryCache?
            var mockMemoryCache = new MemoryCache(new MemoryCacheOptions());

            sut = new PrintRepository(mockIApplicationDbContext.Object, mockMemoryCache);
        }

        [Test]
        [TestCase(1, ExpectedResult = "Default")]
        [TestCase(6, ExpectedResult = "Alternative")]
        public async Task<string> GetPrintConfigurationByVersion_ValidVersion_SpecifiedConfig(int versionId)
        {
            var printConfiguration = await sut.GetPrintConfigurationByVersion(versionId);

            return printConfiguration.PrintConfiguration.Name;
        }

        [Test]
        [TestCase(1, ExpectedResult = 1)]
		[TestCase(6, ExpectedResult = 2)]
		public async Task<int> GetPrintConfigurationByVersion_ValidVersion_DefaultConfig(int versionId)
        {
            var printConfiguration = await sut.GetPrintConfigurationByVersion(versionId);

            return printConfiguration.PrintConfigurationId;
        }

        [Test]
        [TestCase(0)]
		[TestCase(99)]
		public void GetPrintConfigurationByVersion_InvalidVersion(int versionId)
        {
			Assert.ThrowsAsync<KeyNotFoundException>(async () => await sut.GetPrintConfigurationByVersion(versionId) );
		}
    }
}
