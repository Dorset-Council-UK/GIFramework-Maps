using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddTheme : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ThemeId",
                table: "Versions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Theme",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    PrimaryColour = table.Column<string>(type: "text", nullable: true),
                    LogoURL = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Theme", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Versions_ThemeId",
                table: "Versions",
                column: "ThemeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Versions_Theme_ThemeId",
                table: "Versions",
                column: "ThemeId",
                principalTable: "Theme",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Versions_Theme_ThemeId",
                table: "Versions");

            migrationBuilder.DropTable(
                name: "Theme");

            migrationBuilder.DropIndex(
                name: "IX_Versions_ThemeId",
                table: "Versions");

            migrationBuilder.DropColumn(
                name: "ThemeId",
                table: "Versions");
        }
    }
}
