using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddFilterOptionsToLayer : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "DefaultFilterEditable",
                schema: "giframeworkmaps",
                table: "Layer",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "Filterable",
                schema: "giframeworkmaps",
                table: "Layer",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultFilterEditable",
                schema: "giframeworkmaps",
                table: "Layer");

            migrationBuilder.DropColumn(
                name: "Filterable",
                schema: "giframeworkmaps",
                table: "Layer");
        }
    }
}
