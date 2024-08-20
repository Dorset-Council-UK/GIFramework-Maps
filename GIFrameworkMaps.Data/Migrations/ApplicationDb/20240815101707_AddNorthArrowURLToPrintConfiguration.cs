using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddNorthArrowURLToPrintConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Basemaps_LayerSources_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemaps");

            migrationBuilder.AddColumn<string>(
                name: "NorthArrowURL",
                schema: "giframeworkmaps",
                table: "PrintConfigurations",
                type: "text",
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemaps",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Basemaps_LayerSources_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemaps",
                column: "LayerSourceId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerSources",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Basemaps_LayerSources_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemaps");

            migrationBuilder.DropColumn(
                name: "NorthArrowURL",
                schema: "giframeworkmaps",
                table: "PrintConfigurations");

            migrationBuilder.AlterColumn<int>(
                name: "LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemaps",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddForeignKey(
                name: "FK_Basemaps_LayerSources_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemaps",
                column: "LayerSourceId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerSources",
                principalColumn: "Id");
        }
    }
}
