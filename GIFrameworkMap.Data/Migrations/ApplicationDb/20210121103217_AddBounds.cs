using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddBounds : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BoundId",
                table: "Versions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Bound",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true),
                    BottomLeftX = table.Column<decimal>(type: "numeric", nullable: false),
                    BottomLeftY = table.Column<decimal>(type: "numeric", nullable: false),
                    TopRightX = table.Column<decimal>(type: "numeric", nullable: false),
                    TopRightY = table.Column<decimal>(type: "numeric", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bound", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Versions_BoundId",
                table: "Versions",
                column: "BoundId");

            migrationBuilder.AddForeignKey(
                name: "FK_Versions_Bound_BoundId",
                table: "Versions",
                column: "BoundId",
                principalTable: "Bound",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Versions_Bound_BoundId",
                table: "Versions");

            migrationBuilder.DropTable(
                name: "Bound");

            migrationBuilder.DropIndex(
                name: "IX_Versions_BoundId",
                table: "Versions");

            migrationBuilder.DropColumn(
                name: "BoundId",
                table: "Versions");
        }
    }
}
