using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddVersionLayerToVersions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VersionLayer",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    VersionId = table.Column<int>(type: "integer", nullable: false),
                    LayerId = table.Column<int>(type: "integer", nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: false),
                    IsDefault = table.Column<bool>(type: "boolean", nullable: false),
                    DefaultOpacity = table.Column<int>(type: "integer", nullable: false),
                    DefaultSaturation = table.Column<int>(type: "integer", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VersionLayer", x => new { x.LayerId, x.VersionId });
                    table.ForeignKey(
                        name: "FK_VersionLayer_Category_CategoryId",
                        column: x => x.CategoryId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Category",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VersionLayer_Layer_LayerId",
                        column: x => x.LayerId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Layer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VersionLayer_Versions_VersionId",
                        column: x => x.VersionId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Versions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VersionLayer_CategoryId",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_VersionLayer_VersionId",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                column: "VersionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VersionLayer",
                schema: "giframeworkmaps");
        }
    }
}
