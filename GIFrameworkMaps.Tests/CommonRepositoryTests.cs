using NUnit.Framework;
using Moq;
using GIFrameworkMaps.Data;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Extensions.Caching.Memory;
using GIFrameworkMaps.Data.Models.Authorization;
using AutoMapper;
using Microsoft.AspNetCore.Http;

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
                new Version { Name = "General version",Slug= "general",Id=1 },
                new Version { Name = "Valid Version Test",Slug= "valid/version",Id=2 },
                new Version { Name = "Valid Version Test 2",Slug= "valid/version/two",Id=3 },
                new Version { Name = "Requires Login",Slug= "requires/login",Id=4 ,RequireLogin=true},
                new Version { Name = "Requires Login 2",Slug= "requires/login/two",Id=5, RequireLogin=true }
            }.AsQueryable();

            var roles = new List<ApplicationRole>
            {
                new ApplicationRole{Id=1,RoleName="GIFWAdmin"}
            };
            var rolesQueryable = roles.AsQueryable(); ;

            var userRoles = new List<ApplicationUserRole>
            {
                new ApplicationUserRole{UserId = "36850518-dd0a-48e0-9004-cdaf30d82746",Role=roles.First()}
            }.AsQueryable(); ;

            var users = new List<VersionUser>
            {
                new VersionUser{UserId="36850518-dd0a-48e0-9004-cdaf30d82746",VersionId=4 }
            }.AsQueryable();



            var versionsMockSet = new Mock<DbSet<Version>>();
            versionsMockSet.As<IQueryable<Version>>().Setup(m => m.Provider).Returns(versions.Provider);
            versionsMockSet.As<IQueryable<Version>>().Setup(m => m.Expression).Returns(versions.Expression);
            versionsMockSet.As<IQueryable<Version>>().Setup(m => m.ElementType).Returns(versions.ElementType);
            versionsMockSet.As<IQueryable<Version>>().Setup(m => m.GetEnumerator()).Returns(versions.GetEnumerator());
            var versionUsersMockSet = new Mock<DbSet<VersionUser>>();
            versionUsersMockSet.As<IQueryable<VersionUser>>().Setup(m => m.Provider).Returns(users.Provider);
            versionUsersMockSet.As<IQueryable<VersionUser>>().Setup(m => m.Expression).Returns(users.Expression);
            versionUsersMockSet.As<IQueryable<VersionUser>>().Setup(m => m.ElementType).Returns(users.ElementType);
            versionUsersMockSet.As<IQueryable<VersionUser>>().Setup(m => m.GetEnumerator()).Returns(users.GetEnumerator());
            var rolesMockSet = new Mock<DbSet<ApplicationRole>>();
            rolesMockSet.As<IQueryable<ApplicationRole>>().Setup(m => m.Provider).Returns(rolesQueryable.Provider);
            rolesMockSet.As<IQueryable<ApplicationRole>>().Setup(m => m.Expression).Returns(rolesQueryable.Expression);
            rolesMockSet.As<IQueryable<ApplicationRole>>().Setup(m => m.ElementType).Returns(rolesQueryable.ElementType);
            rolesMockSet.As<IQueryable<ApplicationRole>>().Setup(m => m.GetEnumerator()).Returns(rolesQueryable.GetEnumerator());
            var userRolesMockSet = new Mock<DbSet<ApplicationUserRole>>();
            userRolesMockSet.As<IQueryable<ApplicationUserRole>>().Setup(m => m.Provider).Returns(userRoles.Provider);
            userRolesMockSet.As<IQueryable<ApplicationUserRole>>().Setup(m => m.Expression).Returns(userRoles.Expression);
            userRolesMockSet.As<IQueryable<ApplicationUserRole>>().Setup(m => m.ElementType).Returns(userRoles.ElementType);
            userRolesMockSet.As<IQueryable<ApplicationUserRole>>().Setup(m => m.GetEnumerator()).Returns(userRoles.GetEnumerator());

            var mockApplicationDbContext = new Mock<IApplicationDbContext>();
            mockApplicationDbContext.Setup(m => m.Versions).Returns(versionsMockSet.Object);
            mockApplicationDbContext.Setup(m => m.VersionUser).Returns(versionUsersMockSet.Object);
            mockApplicationDbContext.Setup(m => m.ApplicationRoles).Returns(rolesMockSet.Object);
            mockApplicationDbContext.Setup(m => m.ApplicationUserRoles).Returns(userRolesMockSet.Object);

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

    }
}