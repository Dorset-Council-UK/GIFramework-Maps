using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddBasicLayerCategories : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VersionLayer",
                schema: "giframeworkmaps");

            migrationBuilder.CreateTable(
                name: "Category",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Category", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VersionCategory",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    VersionId = table.Column<int>(type: "integer", nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VersionCategory", x => new { x.CategoryId, x.VersionId });
                    table.ForeignKey(
                        name: "FK_VersionCategory_Category_CategoryId",
                        column: x => x.CategoryId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Category",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VersionCategory_Versions_VersionId",
                        column: x => x.VersionId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Versions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VersionCategory_VersionId",
                schema: "giframeworkmaps",
                table: "VersionCategory",
                column: "VersionId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VersionCategory",
                schema: "giframeworkmaps");

            migrationBuilder.DropTable(
                name: "Category",
                schema: "giframeworkmaps");

            migrationBuilder.CreateTable(
                name: "VersionLayer",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    LayerId = table.Column<int>(type: "integer", nullable: false),
                    VersionId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VersionLayer", x => new { x.LayerId, x.VersionId });
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
                name: "IX_VersionLayer_VersionId",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                column: "VersionId");
        }
    }
}
