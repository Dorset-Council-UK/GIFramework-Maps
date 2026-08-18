using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddFavouriteLayersTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FavouriteLayers",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    LayerId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FavouriteLayers", x => new { x.LayerId, x.UserId });
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FavouriteLayers",
                schema: "giframeworkmaps");
        }
    }
}
