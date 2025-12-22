using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddZoomLevelsToLayerSource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxZoom",
                schema: "giframeworkmaps",
                table: "LayerSources",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinZoom",
                schema: "giframeworkmaps",
                table: "LayerSources",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxZoom",
                schema: "giframeworkmaps",
                table: "LayerSources");

            migrationBuilder.DropColumn(
                name: "MinZoom",
                schema: "giframeworkmaps",
                table: "LayerSources");
        }
    }
}
