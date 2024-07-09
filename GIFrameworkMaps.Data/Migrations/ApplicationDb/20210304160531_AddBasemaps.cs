using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddBasemaps : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Basemap",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    LayerSourceId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Basemap", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Basemap_LayerSource_LayerSourceId",
                        column: x => x.LayerSourceId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "LayerSource",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VersionBasemap",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    VersionId = table.Column<int>(type: "integer", nullable: false),
                    BasemapId = table.Column<int>(type: "integer", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VersionBasemap", x => new { x.BasemapId, x.VersionId });
                    table.ForeignKey(
                        name: "FK_VersionBasemap_Basemap_BasemapId",
                        column: x => x.BasemapId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Basemap",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VersionBasemap_Versions_VersionId",
                        column: x => x.VersionId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Versions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Basemap_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemap",
                column: "LayerSourceId");

            migrationBuilder.CreateIndex(
                name: "IX_VersionBasemap_VersionId",
                schema: "giframeworkmaps",
                table: "VersionBasemap",
                column: "VersionId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VersionBasemap",
                schema: "giframeworkmaps");

            migrationBuilder.DropTable(
                name: "Basemap",
                schema: "giframeworkmaps");
        }
    }
}
