using Microsoft.EntityFrameworkCore.Migrations;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddBoundToBasemap : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BoundId",
                schema: "giframeworkmaps",
                table: "Basemap",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Basemap_BoundId",
                schema: "giframeworkmaps",
                table: "Basemap",
                column: "BoundId");

            migrationBuilder.AddForeignKey(
                name: "FK_Basemap_Bound_BoundId",
                schema: "giframeworkmaps",
                table: "Basemap",
                column: "BoundId",
                principalSchema: "giframeworkmaps",
                principalTable: "Bound",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Basemap_Bound_BoundId",
                schema: "giframeworkmaps",
                table: "Basemap");

            migrationBuilder.DropIndex(
                name: "IX_Basemap_BoundId",
                schema: "giframeworkmaps",
                table: "Basemap");

            migrationBuilder.DropColumn(
                name: "BoundId",
                schema: "giframeworkmaps",
                table: "Basemap");
        }
    }
}
