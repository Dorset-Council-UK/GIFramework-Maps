using Microsoft.EntityFrameworkCore.Migrations;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class UpdateVersionSearchDefs : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Enabled",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinition",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Order",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinition",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "StopIfFound",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinition",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Enabled",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinition");

            migrationBuilder.DropColumn(
                name: "Order",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinition");

            migrationBuilder.DropColumn(
                name: "StopIfFound",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinition");
        }
    }
}
