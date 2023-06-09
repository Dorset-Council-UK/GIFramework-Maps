using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class UpdateAnalyticAndCookieTablenames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_cookieControlDefinitions",
                schema: "giframeworkmaps",
                table: "cookieControlDefinitions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_analyticsDefinitions",
                schema: "giframeworkmaps",
                table: "analyticsDefinitions");

            migrationBuilder.RenameTable(
                name: "cookieControlDefinitions",
                schema: "giframeworkmaps",
                newName: "CookieControlDefinitions",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "analyticsDefinitions",
                schema: "giframeworkmaps",
                newName: "AnalyticsDefinitions",
                newSchema: "giframeworkmaps");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CookieControlDefinitions",
                schema: "giframeworkmaps",
                table: "CookieControlDefinitions",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AnalyticsDefinitions",
                schema: "giframeworkmaps",
                table: "AnalyticsDefinitions",
                column: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_CookieControlDefinitions",
                schema: "giframeworkmaps",
                table: "CookieControlDefinitions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AnalyticsDefinitions",
                schema: "giframeworkmaps",
                table: "AnalyticsDefinitions");

            migrationBuilder.RenameTable(
                name: "CookieControlDefinitions",
                schema: "giframeworkmaps",
                newName: "cookieControlDefinitions",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "AnalyticsDefinitions",
                schema: "giframeworkmaps",
                newName: "analyticsDefinitions",
                newSchema: "giframeworkmaps");

            migrationBuilder.AddPrimaryKey(
                name: "PK_cookieControlDefinitions",
                schema: "giframeworkmaps",
                table: "cookieControlDefinitions",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_analyticsDefinitions",
                schema: "giframeworkmaps",
                table: "analyticsDefinitions",
                column: "Id");
        }
    }
}
