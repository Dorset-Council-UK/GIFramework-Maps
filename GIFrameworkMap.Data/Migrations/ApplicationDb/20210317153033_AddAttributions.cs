using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddAttributions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSource",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Attribution",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: true),
                    AttributionHTML = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Attribution", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LayerSource_AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSource",
                column: "AttributionId");

            migrationBuilder.AddForeignKey(
                name: "FK_LayerSource_Attribution_AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSource",
                column: "AttributionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Attribution",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LayerSource_Attribution_AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSource");

            migrationBuilder.DropTable(
                name: "Attribution",
                schema: "giframeworkmaps");

            migrationBuilder.DropIndex(
                name: "IX_LayerSource_AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSource");

            migrationBuilder.DropColumn(
                name: "AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSource");
        }
    }
}
