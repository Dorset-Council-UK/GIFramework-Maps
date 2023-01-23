using Microsoft.EntityFrameworkCore.Migrations;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddLayersToCategories : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CategoryLayer",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    CategoriesId = table.Column<int>(type: "integer", nullable: false),
                    LayersId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CategoryLayer", x => new { x.CategoriesId, x.LayersId });
                    table.ForeignKey(
                        name: "FK_CategoryLayer_Category_CategoriesId",
                        column: x => x.CategoriesId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Category",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CategoryLayer_Layer_LayersId",
                        column: x => x.LayersId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Layer",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CategoryLayer_LayersId",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                column: "LayersId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CategoryLayer",
                schema: "giframeworkmaps");
        }
    }
}
