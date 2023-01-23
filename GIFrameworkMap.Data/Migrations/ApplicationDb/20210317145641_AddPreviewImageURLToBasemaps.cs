using Microsoft.EntityFrameworkCore.Migrations;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddPreviewImageURLToBasemaps : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PreviewImageURL",
                schema: "giframeworkmaps",
                table: "Basemap",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PreviewImageURL",
                schema: "giframeworkmaps",
                table: "Basemap");
        }
    }
}
