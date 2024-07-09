using Microsoft.EntityFrameworkCore.Migrations;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddSortOrderToCategoryLayer : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CategoryLayer_Category_CategoriesId",
                schema: "giframeworkmaps",
                table: "CategoryLayer");

            migrationBuilder.DropForeignKey(
                name: "FK_CategoryLayer_Layer_LayersId",
                schema: "giframeworkmaps",
                table: "CategoryLayer");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CategoryLayer",
                schema: "giframeworkmaps",
                table: "CategoryLayer");

            migrationBuilder.DropIndex(
                name: "IX_CategoryLayer_LayersId",
                schema: "giframeworkmaps",
                table: "CategoryLayer");

            migrationBuilder.RenameColumn(
                name: "LayersId",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                newName: "SortOrder");

            migrationBuilder.RenameColumn(
                name: "CategoriesId",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                newName: "LayerId");

            migrationBuilder.AddColumn<int>(
                name: "CategoryId",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddPrimaryKey(
                name: "PK_CategoryLayer",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                columns: new[] { "CategoryId", "LayerId" });

            migrationBuilder.CreateIndex(
                name: "IX_CategoryLayer_LayerId",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                column: "LayerId");

            migrationBuilder.AddForeignKey(
                name: "FK_CategoryLayer_Category_CategoryId",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                column: "CategoryId",
                principalSchema: "giframeworkmaps",
                principalTable: "Category",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CategoryLayer_Layer_LayerId",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                column: "LayerId",
                principalSchema: "giframeworkmaps",
                principalTable: "Layer",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CategoryLayer_Category_CategoryId",
                schema: "giframeworkmaps",
                table: "CategoryLayer");

            migrationBuilder.DropForeignKey(
                name: "FK_CategoryLayer_Layer_LayerId",
                schema: "giframeworkmaps",
                table: "CategoryLayer");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CategoryLayer",
                schema: "giframeworkmaps",
                table: "CategoryLayer");

            migrationBuilder.DropIndex(
                name: "IX_CategoryLayer_LayerId",
                schema: "giframeworkmaps",
                table: "CategoryLayer");

            migrationBuilder.DropColumn(
                name: "CategoryId",
                schema: "giframeworkmaps",
                table: "CategoryLayer");

            migrationBuilder.RenameColumn(
                name: "SortOrder",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                newName: "LayersId");

            migrationBuilder.RenameColumn(
                name: "LayerId",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                newName: "CategoriesId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CategoryLayer",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                columns: new[] { "CategoriesId", "LayersId" });

            migrationBuilder.CreateIndex(
                name: "IX_CategoryLayer_LayersId",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                column: "LayersId");

            migrationBuilder.AddForeignKey(
                name: "FK_CategoryLayer_Category_CategoriesId",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                column: "CategoriesId",
                principalSchema: "giframeworkmaps",
                principalTable: "Category",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CategoryLayer_Layer_LayersId",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                column: "LayersId",
                principalSchema: "giframeworkmaps",
                principalTable: "Layer",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
