using Microsoft.EntityFrameworkCore.Migrations;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddMaxMinZoomToBasemap : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxZoom",
                schema: "giframeworkmaps",
                table: "Basemap",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MinZoom",
                schema: "giframeworkmaps",
                table: "Basemap",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxZoom",
                schema: "giframeworkmaps",
                table: "Basemap");

            migrationBuilder.DropColumn(
                name: "MinZoom",
                schema: "giframeworkmaps",
                table: "Basemap");
        }
    }
}
