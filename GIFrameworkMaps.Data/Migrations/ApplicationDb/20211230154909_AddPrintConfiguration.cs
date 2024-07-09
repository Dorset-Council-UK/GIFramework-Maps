using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddPrintConfiguration : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PrintConfigurations",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: true),
                    LogoURL = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PrintConfigurations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VersionPrintConfiguration",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    VersionId = table.Column<int>(type: "integer", nullable: false),
                    PrintConfigurationId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VersionPrintConfiguration", x => new { x.PrintConfigurationId, x.VersionId });
                    table.ForeignKey(
                        name: "FK_VersionPrintConfiguration_PrintConfigurations_PrintConfigur~",
                        column: x => x.PrintConfigurationId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "PrintConfigurations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VersionPrintConfiguration_Versions_VersionId",
                        column: x => x.VersionId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Versions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VersionPrintConfiguration_VersionId",
                schema: "giframeworkmaps",
                table: "VersionPrintConfiguration",
                column: "VersionId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VersionPrintConfiguration",
                schema: "giframeworkmaps");

            migrationBuilder.DropTable(
                name: "PrintConfigurations",
                schema: "giframeworkmaps");
        }
    }
}
