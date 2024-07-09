using Microsoft.EntityFrameworkCore.Migrations;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddParentCategory : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ParentCategoryId",
                schema: "giframeworkmaps",
                table: "Category",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Category_ParentCategoryId",
                schema: "giframeworkmaps",
                table: "Category",
                column: "ParentCategoryId");

            migrationBuilder.AddForeignKey(
                name: "FK_Category_Category_ParentCategoryId",
                schema: "giframeworkmaps",
                table: "Category",
                column: "ParentCategoryId",
                principalSchema: "giframeworkmaps",
                principalTable: "Category",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Category_Category_ParentCategoryId",
                schema: "giframeworkmaps",
                table: "Category");

            migrationBuilder.DropIndex(
                name: "IX_Category_ParentCategoryId",
                schema: "giframeworkmaps",
                table: "Category");

            migrationBuilder.DropColumn(
                name: "ParentCategoryId",
                schema: "giframeworkmaps",
                table: "Category");
        }
    }
}
