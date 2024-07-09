using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddBasicLayers : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "VersionUser",
                newName: "VersionUser",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Versions",
                newName: "Versions",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Theme",
                newName: "Theme",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Bound",
                newName: "Bound",
                newSchema: "giframeworkmaps");

            migrationBuilder.CreateTable(
                name: "LayerSourceType",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LayerSourceType", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LayerSource",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    LayerSourceTypeId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LayerSource", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LayerSource_LayerSourceType_LayerSourceTypeId",
                        column: x => x.LayerSourceTypeId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "LayerSourceType",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Layer",
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
                    table.PrimaryKey("PK_Layer", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Layer_LayerSource_LayerSourceId",
                        column: x => x.LayerSourceId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "LayerSource",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "LayerSourceOption",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Value = table.Column<string>(type: "text", nullable: true),
                    LayerSourceId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LayerSourceOption", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LayerSourceOption_LayerSource_LayerSourceId",
                        column: x => x.LayerSourceId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "LayerSource",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VersionLayer",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    VersionId = table.Column<int>(type: "integer", nullable: false),
                    LayerId = table.Column<int>(type: "integer", nullable: false)
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
                name: "IX_Layer_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Layer",
                column: "LayerSourceId");

            migrationBuilder.CreateIndex(
                name: "IX_LayerSource_LayerSourceTypeId",
                schema: "giframeworkmaps",
                table: "LayerSource",
                column: "LayerSourceTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_LayerSourceOption_LayerSourceId",
                schema: "giframeworkmaps",
                table: "LayerSourceOption",
                column: "LayerSourceId");

            migrationBuilder.CreateIndex(
                name: "IX_VersionLayer_VersionId",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                column: "VersionId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LayerSourceOption",
                schema: "giframeworkmaps");

            migrationBuilder.DropTable(
                name: "VersionLayer",
                schema: "giframeworkmaps");

            migrationBuilder.DropTable(
                name: "Layer",
                schema: "giframeworkmaps");

            migrationBuilder.DropTable(
                name: "LayerSource",
                schema: "giframeworkmaps");

            migrationBuilder.DropTable(
                name: "LayerSourceType",
                schema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "VersionUser",
                schema: "giframeworkmaps",
                newName: "VersionUser");

            migrationBuilder.RenameTable(
                name: "Versions",
                schema: "giframeworkmaps",
                newName: "Versions");

            migrationBuilder.RenameTable(
                name: "Theme",
                schema: "giframeworkmaps",
                newName: "Theme");

            migrationBuilder.RenameTable(
                name: "Bound",
                schema: "giframeworkmaps",
                newName: "Bound");

            migrationBuilder.RenameTable(
                name: "ApplicationUser",
                schema: "giframeworkmaps",
                newName: "ApplicationUser");
        }
    }
}
