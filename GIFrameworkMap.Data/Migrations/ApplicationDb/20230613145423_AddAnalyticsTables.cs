using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddAnalyticsTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AnalyticsDefinitions",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ProductName = table.Column<string>(type: "text", nullable: true),
                    ProductKey = table.Column<string>(type: "text", nullable: true),
                    DateModified = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnalyticsDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VersionAnalytic",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    VersionId = table.Column<int>(type: "integer", nullable: false),
                    AnalyticsDefinitionId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VersionAnalytic", x => new { x.AnalyticsDefinitionId, x.VersionId });
                    table.ForeignKey(
                        name: "FK_VersionAnalytic_AnalyticsDefinitions_AnalyticsDefinitionId",
                        column: x => x.AnalyticsDefinitionId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "AnalyticsDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VersionAnalytic_Versions_VersionId",
                        column: x => x.VersionId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Versions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VersionAnalytic_VersionId",
                schema: "giframeworkmaps",
                table: "VersionAnalytic",
                column: "VersionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.DropTable(
                name: "VersionAnalytic",
                schema: "giframeworkmaps");

            migrationBuilder.DropTable(
                name: "AnalyticsDefinitions",
                schema: "giframeworkmaps");
        }
    }
}
