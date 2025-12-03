using GIFrameworkMaps.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using NUnit.Framework;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Tests
{
	internal class CommonRepositoryTests : DbContextBaseTest
	{
        private CommonRepository sut;

		[SetUp]
        public void Setup()
        {
			var mockLogger = new Mock<ILogger<CommonRepository>>();
			var mockIApplicationDbContext = SetupMockIApplicationDbContext();
			// TODO: Add some parameters to the mockMemoryCache?
			var mockMemoryCache = new MemoryCache(new MemoryCacheOptions());

			//Mock IHttpContextAccessor
			var mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
			var context = new DefaultHttpContext();
			mockHttpContextAccessor.Setup(_ => _.HttpContext).Returns(context);

			sut = new CommonRepository(mockLogger.Object, mockIApplicationDbContext.Object, mockMemoryCache, mockHttpContextAccessor.Object);
		}

        [Test]
        [TestCase("valid","version","", ExpectedResult = "Valid Version Test")]
        [TestCase("general", "", "", ExpectedResult = "General version")]
        [TestCase("VaLID", "VERSION", "tWo", ExpectedResult = "Valid Version Test 2")]
        public async Task<string> GetVersionBySlug(string slug1, string slug2, string slug3)
        {
			var version = await sut.GetVersionBySlug(slug1, slug2, slug3);
			return version.Name;
        }

        [Test]
        [TestCase("", "", "")]
        [TestCase("does", "not", "exist")]
        [TestCase("valid", "version", "doesntexist")]
        public async Task GetVersionBySlug_VersionDoesNotExist(string slug1, string slug2, string slug3)
        {
            var version = await sut.GetVersionBySlug(slug1, slug2, slug3);

            Assert.That(version, Is.Null);
        }

		[Test]
		[TestCase("General", "", "", ExpectedResult = "general")]
		[TestCase("VaLid", "VerSion", "", ExpectedResult = "valid/version")]
		[TestCase("VaLid", "VerSion", "TwO", ExpectedResult = "valid/version/two")]
		public async Task<string> GetVersionBySlug_SlugIsLowercaseWithSlashes(string slug1, string slug2, string slug3)
		{
			var version = await sut.GetVersionBySlug(slug1, slug2, slug3);
			return version?.Slug;
		}

		[Test]
		[TestCase("", "", "general", ExpectedResult = "general")]
		[TestCase("valid", "", "version", ExpectedResult = "valid/version")]
		public async Task<string> GetVersionBySlug_SlugIgnoresEmptyStrings(string slug1, string slug2, string slug3)
		{
			var version = await sut.GetVersionBySlug(slug1, slug2, slug3);
			return version?.Slug;
		}

		[Test]
		[TestCase(null, null, "general", ExpectedResult = "general")]
		[TestCase("valid", null, "version", ExpectedResult = "valid/version")]
		public async Task<string> GetVersionBySlug_SlugIgnoresNullStrings(string slug1, string slug2, string slug3)
		{
			var version = await sut.GetVersionBySlug(slug1, slug2, slug3);
			return version?.Slug;
		}

		[Test]
        [TestCase(1, ExpectedResult = "General version")]
        [TestCase(2, ExpectedResult = "Valid Version Test")]
        [TestCase(3, ExpectedResult = "Valid Version Test 2")]
        public async Task<string> GetVersion_VersionDoesExist(int id)
        {
			var version = await sut.GetVersion(id);
			return version?.Name;
        }

        [Test]
        [TestCase(0)]
        [TestCase(-1)]
        [TestCase(int.MaxValue)]
        public async Task GetVersion_VersionDoesNotExist(int id)
        {
            var version = await sut.GetVersion(id);

            Assert.That(version, Is.Null);
        }

        [Test]
        public async Task GetVersions()
        {
            var versions = await sut.GetVersions();

            Assert.That(versions.Count, Is.EqualTo(10));
        }

        [Test]
        [TestCase("36850518-dd0a-48e0-9004-cdaf30d82746", "test@example.com", 4, ExpectedResult = true)]
        [TestCase("36850518-dd0a-48e0-9004-cdaf30d82746", "test@example.com", 1, ExpectedResult = true)]
		[TestCase("36850518-dd0a-48e0-9004-cdaf30d82746", "test@example.com", 6, ExpectedResult = false)]
		public async Task<bool> CanUserAccessVersion_UserExists_VersionExists(string userId, string email, int versionId)
        {
			return await sut.CanUserAccessVersion(userId, email, versionId);
        }

		[Test]
		[TestCase("36850518-dd0a-48e0-9004-cdaf30d82747", "test@example.com", 5, ExpectedResult = true)]
		[TestCase("36850518-dd0a-48e0-9004-cdaf30d82747", "test@example.net", 5, ExpectedResult = false)]
		[TestCase("36850518-dd0a-48e0-9004-cdaf30d82747", "test@sub.example.net", 5, ExpectedResult = false)]
		public async Task<bool> CanUserAccessVersionWithEmail_UserExists_VersionExists(string userId, string email, int versionId)
		{
			return await sut.CanUserAccessVersion(userId, email, versionId);
		}



		[Test]
        [TestCase("36850518-dd0a-48e0-9004-cdaf30d82746")]
        public void GetUserRoles_UserExists(string userId)
        {
            var roles = sut.GetUserRoles(userId);
            Assert.That(roles.Count, Is.EqualTo(1));
        }

        [Test]
        [TestCase("INVALID_USER")]
        public void GetUserRoles_UserDoesNotExist(string userId)
        {
            var roles = sut.GetUserRoles(userId);
            Assert.That(roles, Is.Empty);
        }

        [Test]
        [TestCase("36850518-dd0a-48e0-9004-cdaf30d82746")]
        public async Task GetBookmarksForUser_UserExists(string userId)
        {
            var bookmarks = await sut.GetBookmarksForUserAsync(userId);
            Assert.That(bookmarks.Count, Is.EqualTo(3));
        }

        [Test]
        [TestCase("10454521-dd0a-48e0-9004-cdaf30d82746")]
        public async Task GetBookmarksForUser_UserDoesNotExist(string userId)
        {
            var bookmarks = await sut.GetBookmarksForUserAsync(userId);
            Assert.That(bookmarks, Is.Empty);
        }

        [Test]
        [TestCase("36850518-dd0a-48e0-9004-cdaf30d82746", ExpectedResult = 3)]
        [TestCase("17819f99-b8d5-4495-8c48-964f5692afdc", ExpectedResult = 2)]
        public async Task<int> GetBookmarksForUser_DoesNotGetOtherUsersBookmarks(string userId)
        {
            var bookmarks = await sut.GetBookmarksForUserAsync(userId);
            return bookmarks.Count;
        }
    }
}