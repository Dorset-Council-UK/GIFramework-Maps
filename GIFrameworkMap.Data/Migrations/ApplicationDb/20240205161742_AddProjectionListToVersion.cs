using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddProjectionListToVersion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Versions_Projections_MapProjectionId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropIndex(
                name: "IX_Versions_MapProjectionId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropColumn(
                name: "MapProjectionId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.CreateTable(
                name: "VersionProjection",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    VersionId = table.Column<int>(type: "integer", nullable: false),
                    ProjectionId = table.Column<int>(type: "integer", nullable: false),
                    IsDefaultMapProjection = table.Column<bool>(type: "boolean", nullable: false),
                    IsDefaultViewProjection = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VersionProjection", x => new { x.ProjectionId, x.VersionId });
                    table.ForeignKey(
                        name: "FK_VersionProjection_Projections_ProjectionId",
                        column: x => x.ProjectionId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Projections",
                        principalColumn: "EPSGCode",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VersionProjection_Versions_VersionId",
                        column: x => x.VersionId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Versions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VersionProjection_VersionId",
                schema: "giframeworkmaps",
                table: "VersionProjection",
                column: "VersionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VersionProjection",
                schema: "giframeworkmaps");

            migrationBuilder.AddColumn<int>(
                name: "MapProjectionId",
                schema: "giframeworkmaps",
                table: "Versions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Versions_MapProjectionId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "MapProjectionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Versions_Projections_MapProjectionId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "MapProjectionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Projections",
                principalColumn: "EPSGCode");
        }
    }
}
