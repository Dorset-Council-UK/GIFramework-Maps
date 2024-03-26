using NUnit.Framework;
using Moq;
using GIFrameworkMaps.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using GIFrameworkMaps.Data.Models;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.Caching.Memory;
using GIFrameworkMaps.Data.Models.Authorization;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;
using MockQueryable.Moq;

namespace GIFrameworkMaps.Tests
{
    public class CommonRepositoryTests
    {
        private ILogger<CommonRepository> _logger;
        private CommonRepository sut;

        [OneTimeSetUp]
        public void OneTimeSetup()
        {
            //This OneTimeSetup creates a mock dataset. It is assumed this dataset will NOT be modified by test code.
            //If this assumption changes, the data should be moved into a [SetUp] method to maintain consistency
            var serviceProvider = new ServiceCollection()
               .AddLogging()
               .BuildServiceProvider();

            var factory = serviceProvider.GetService<ILoggerFactory>();

            _logger = factory.CreateLogger<CommonRepository>();

            var versions = new List<Version>
            {
                new() { Name = "General version",Slug= "general",Id=1 },
                new() { Name = "Valid Version Test",Slug= "valid/version",Id=2 },
                new() { Name = "Valid Version Test 2",Slug= "valid/version/two",Id=3 },
                new() { Name = "Requires Login",Slug= "requires/login",Id=4 ,RequireLogin=true},
                new() { Name = "Requires Login 2",Slug= "requires/login/two",Id=5, RequireLogin=true }
            };

            var roles = new List<ApplicationRole>
            {
                new() {Id=1,RoleName="GIFWAdmin"}
            };

            var userRoles = new List<ApplicationUserRole>
            {
                new() {UserId = "36850518-dd0a-48e0-9004-cdaf30d82746",Role=roles.First()}
            };

            var users = new List<VersionUser>
            {
                new() {UserId="36850518-dd0a-48e0-9004-cdaf30d82746",VersionId=4 }
            };

            var bookmarks = new List<Bookmark>
            {
                new() {UserId="36850518-dd0a-48e0-9004-cdaf30d82746",Name="Test Bookmark",X=(decimal)-283267.6475493251, Y=(decimal)6570725.6916950345, Zoom = 18, Id = 1 },
                new() {UserId="36850518-dd0a-48e0-9004-cdaf30d82746",Name="Test Bookmark 2",X=(decimal)-283945.864, Y=(decimal)61023565.9784, Zoom = 8, Id = 2 },
                new() {UserId="36850518-dd0a-48e0-9004-cdaf30d82746",Name="Test Bookmark 3",X=(decimal)1005456.2345, Y=(decimal)0.456, Zoom = 10, Id = 3 },
                new() {UserId="17819f99-b8d5-4495-8c48-964f5692afdc",Name="Test Bookmark 4",X=(decimal)-283267.6475493251, Y=(decimal)6570725.6916950345, Zoom = 10, Id = 4 },
                new() {UserId="17819f99-b8d5-4495-8c48-964f5692afdc",Name="Test Bookmark 5",X=(decimal)-3894566.44, Y=(decimal)55427657.45, Zoom = 7, Id = 5 },
            };

            var versionsMockSet = versions.AsQueryable().BuildMockDbSet();
            var versionUsersMockSet = users.AsQueryable().BuildMockDbSet();
            var rolesMockSet = roles.AsQueryable().BuildMockDbSet();
            var userRolesMockSet = userRoles.AsQueryable().BuildMockDbSet();
            var bookmarksMockSet = bookmarks.AsQueryable().BuildMockDbSet();

            var mockApplicationDbContext = new Mock<IApplicationDbContext>();
            mockApplicationDbContext.Setup(m => m.Versions).Returns(versionsMockSet.Object);
            mockApplicationDbContext.Setup(m => m.VersionUsers).Returns(versionUsersMockSet.Object);
            mockApplicationDbContext.Setup(m => m.ApplicationRoles).Returns(rolesMockSet.Object);
            mockApplicationDbContext.Setup(m => m.ApplicationUserRoles).Returns(userRolesMockSet.Object);
            mockApplicationDbContext.Setup(m => m.Bookmarks).Returns(bookmarksMockSet.Object);
           

            var mockMemoryCache = new MemoryCache(new MemoryCacheOptions());
            /* TO DO: Add some parameters to the mockMemoryCache? */

            //Mock IHttpContextAccessor
            var mockHttpContextAccessor = new Mock<IHttpContextAccessor>();
            var context = new DefaultHttpContext();
            mockHttpContextAccessor.Setup(_ => _.HttpContext).Returns(context);
            var profile = new AutoMapping();
            var config = new MapperConfiguration(cfg => cfg.AddProfile(profile));
            var mapper = new Mapper(config);

            sut = new CommonRepository(_logger, mockApplicationDbContext.Object, mockMemoryCache, mapper, mockHttpContextAccessor.Object);
        }

        [SetUp]
        public void Setup()
        {

        }

        [Test]
        [TestCase("valid","version","", ExpectedResult = "Valid Version Test")]
        [TestCase("general", "", "", ExpectedResult = "General version")]
        [TestCase("VaLID", "VERSION", "tWo", ExpectedResult = "Valid Version Test 2")]
        public string GetVersionBySlug_ValidSlug(string slug1, string slug2, string slug3)
        {
            return sut.GetVersionBySlug(slug1, slug2, slug3).Name;

        }

        [Test]
        [TestCase("", "", "")]
        [TestCase("does", "not", "exist")]
        [TestCase("valid", "version", "doesntexist")]
        public void GetVersionBySlug_VersionDoesNotExist(string slug1, string slug2, string slug3)
        {
            var version = sut.GetVersionBySlug(slug1, slug2, slug3);

            Assert.That(version, Is.Null);
        }

        [Test]
        [TestCase(1, ExpectedResult = "General version")]
        [TestCase(2, ExpectedResult = "Valid Version Test")]
        [TestCase(3, ExpectedResult = "Valid Version Test 2")]
        public string GetVersion_VersionDoesExist(int id)
        {
            return sut.GetVersion(id).Name;
        }

        [Test]
        [TestCase(0)]
        [TestCase(-1)]
        [TestCase(int.MaxValue)]
        public void GetVersion_VersionDoesNotExist(int id)
        {
            var version = sut.GetVersion(id);

            Assert.That(version, Is.Null);
        }

        [Test]
        public void GetVersions()
        {
            var versions = sut.GetVersions();

            Assert.That(versions.Count, Is.EqualTo(5));
        }

        [Test]
        [TestCase("36850518-dd0a-48e0-9004-cdaf30d82746",4,ExpectedResult =true)]
        [TestCase("36850518-dd0a-48e0-9004-cdaf30d82746", 1, ExpectedResult = true)]
        [TestCase("36850518-dd0a-48e0-9004-cdaf30d82746", 5, ExpectedResult = false)]
        public bool CanUserAccessVersion_UserExists_VersionExists(string userId, int versionId)
        {
            return sut.CanUserAccessVersion(userId, versionId);
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