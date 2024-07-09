using Microsoft.EntityFrameworkCore.Migrations;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddZoomAndBoundToLayer : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BoundId",
                schema: "giframeworkmaps",
                table: "Layer",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxZoom",
                schema: "giframeworkmaps",
                table: "Layer",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinZoom",
                schema: "giframeworkmaps",
                table: "Layer",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Layer_BoundId",
                schema: "giframeworkmaps",
                table: "Layer",
                column: "BoundId");

            migrationBuilder.AddForeignKey(
                name: "FK_Layer_Bound_BoundId",
                schema: "giframeworkmaps",
                table: "Layer",
                column: "BoundId",
                principalSchema: "giframeworkmaps",
                principalTable: "Bound",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Layer_Bound_BoundId",
                schema: "giframeworkmaps",
                table: "Layer");

            migrationBuilder.DropIndex(
                name: "IX_Layer_BoundId",
                schema: "giframeworkmaps",
                table: "Layer");

            migrationBuilder.DropColumn(
                name: "BoundId",
                schema: "giframeworkmaps",
                table: "Layer");

            migrationBuilder.DropColumn(
                name: "MaxZoom",
                schema: "giframeworkmaps",
                table: "Layer");

            migrationBuilder.DropColumn(
                name: "MinZoom",
                schema: "giframeworkmaps",
                table: "Layer");
        }
    }
}
