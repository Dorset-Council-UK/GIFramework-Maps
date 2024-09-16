using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddAttributionIdToVersion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Basemaps_LayerSources_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemaps");

            migrationBuilder.AddColumn<int>(
                name: "AttributionId",
                schema: "giframeworkmaps",
                table: "Versions",
                type: "integer",
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

            migrationBuilder.CreateIndex(
                name: "IX_Versions_AttributionId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "AttributionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Basemaps_LayerSources_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemaps",
                column: "LayerSourceId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerSources",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Versions_Attributions_AttributionId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "AttributionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Attributions",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Basemaps_LayerSources_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemaps");

            migrationBuilder.DropForeignKey(
                name: "FK_Versions_Attributions_AttributionId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropIndex(
                name: "IX_Versions_AttributionId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropColumn(
                name: "AttributionId",
                schema: "giframeworkmaps",
                table: "Versions");

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
