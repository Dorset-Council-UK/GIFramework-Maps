using GIFrameworkMaps.Data;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Authorization;
using MockQueryable.Moq;
using Moq;
using System.Collections.Generic;
using System.Linq;

namespace GIFrameworkMaps.Tests
{
	/// <summary>
	///		<para>Mock the database context.</para>
	///		<para>This will work if you are mocking the interface, for example IApplicationDbContext.</para>
	///		<para>A better option in the future is a throwaway PostgreSQL Docker container to get accurate testing instead of an in memory database.</para>
	/// </summary>
	internal abstract class DbContextBaseTest
	{
		/// <summary>
		/// If you are using the DbContext interface then you can mock that directly.
		/// </summary>
		protected static Mock<IApplicationDbContext> SetupMockIApplicationDbContext()
		{
			var versions = new List<Version>
			{
				new() { Name = "General version", Slug= "general", Id=1 },
				new() { Name = "Valid Version Test", Slug= "valid/version", Id=2 },
				new() { Name = "Valid Version Test 2", Slug= "valid/version/two", Id=3 },
				new() { Name = "Requires Login", Slug= "requires/login", Id=4, RequireLogin=true },
				new() { Name = "Requires Login 2", Slug= "requires/login/two", Id=5, RequireLogin=true }
			};

			var roles = new List<ApplicationRole>
			{
				new() { Id=1, RoleName="GIFWAdmin" }
			};

			var userRoles = new List<ApplicationUserRole>
			{
				new() { UserId = "36850518-dd0a-48e0-9004-cdaf30d82746", Role=roles.First() }
			};

			var users = new List<VersionUser>
			{
				new() { UserId="36850518-dd0a-48e0-9004-cdaf30d82746", VersionId=4 }
			};

			var bookmarks = new List<Bookmark>
			{
				new() { UserId="36850518-dd0a-48e0-9004-cdaf30d82746", Name="Test Bookmark", X=(decimal)-283267.6475493251, Y=(decimal)6570725.6916950345, Zoom = 18, Id = 1 },
				new() { UserId="36850518-dd0a-48e0-9004-cdaf30d82746", Name="Test Bookmark 2", X=(decimal)-283945.864, Y=(decimal)61023565.9784, Zoom = 8, Id = 2 },
				new() { UserId="36850518-dd0a-48e0-9004-cdaf30d82746", Name="Test Bookmark 3", X=(decimal)1005456.2345, Y=(decimal)0.456, Zoom = 10, Id = 3 },
				new() { UserId="17819f99-b8d5-4495-8c48-964f5692afdc", Name="Test Bookmark 4", X=(decimal)-283267.6475493251, Y=(decimal)6570725.6916950345, Zoom = 10, Id = 4 },
				new() { UserId="17819f99-b8d5-4495-8c48-964f5692afdc", Name="Test Bookmark 5", X=(decimal)-3894566.44, Y=(decimal)55427657.45, Zoom = 7, Id = 5 },
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

			return mockApplicationDbContext;
		}
	}
}
