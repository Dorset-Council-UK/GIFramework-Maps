using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddMinMaxZoomToVersionLayers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxZoom",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinZoom",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxZoom",
                schema: "giframeworkmaps",
                table: "VersionLayer");

            migrationBuilder.DropColumn(
                name: "MinZoom",
                schema: "giframeworkmaps",
                table: "VersionLayer");
        }
    }
}
