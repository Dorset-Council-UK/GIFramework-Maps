using Microsoft.EntityFrameworkCore.Migrations;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddLayerOpacitySaturation : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DefaultOpacity",
                schema: "giframeworkmaps",
                table: "Layer",
                type: "integer",
                nullable: false,
                defaultValue: 100);

            migrationBuilder.AddColumn<int>(
                name: "DefaultSaturation",
                schema: "giframeworkmaps",
                table: "Layer",
                type: "integer",
                nullable: false,
                defaultValue: 100);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultOpacity",
                schema: "giframeworkmaps",
                table: "Layer");

            migrationBuilder.DropColumn(
                name: "DefaultSaturation",
                schema: "giframeworkmaps",
                table: "Layer");
        }
    }
}
