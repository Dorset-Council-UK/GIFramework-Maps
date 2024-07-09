using Microsoft.EntityFrameworkCore.Migrations;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddMBRToAPIDefinition : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MBRXMaxPath",
                schema: "giframeworkmaps",
                table: "SearchDefinitions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MBRXMinPath",
                schema: "giframeworkmaps",
                table: "SearchDefinitions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MBRYMaxPath",
                schema: "giframeworkmaps",
                table: "SearchDefinitions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MBRYMinPath",
                schema: "giframeworkmaps",
                table: "SearchDefinitions",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MBRXMaxPath",
                schema: "giframeworkmaps",
                table: "SearchDefinitions");

            migrationBuilder.DropColumn(
                name: "MBRXMinPath",
                schema: "giframeworkmaps",
                table: "SearchDefinitions");

            migrationBuilder.DropColumn(
                name: "MBRYMaxPath",
                schema: "giframeworkmaps",
                table: "SearchDefinitions");

            migrationBuilder.DropColumn(
                name: "MBRYMinPath",
                schema: "giframeworkmaps",
                table: "SearchDefinitions");
        }
    }
}
