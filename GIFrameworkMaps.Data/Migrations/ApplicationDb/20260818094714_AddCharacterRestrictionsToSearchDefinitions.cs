using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddCharacterRestrictionsToSearchDefinitions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxSearchTextLength",
                schema: "giframeworkmaps",
                table: "SearchDefinitions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinSearchTextLength",
                schema: "giframeworkmaps",
                table: "SearchDefinitions",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxSearchTextLength",
                schema: "giframeworkmaps",
                table: "SearchDefinitions");

            migrationBuilder.DropColumn(
                name: "MinSearchTextLength",
                schema: "giframeworkmaps",
                table: "SearchDefinitions");
        }
    }
}
