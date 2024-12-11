using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddLayerDisclaimerTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LayerDisclaimerId",
                schema: "giframeworkmaps",
                table: "Layers",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "LayerDisclaimers",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Disclaimer = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    Frequency = table.Column<int>(type: "integer", nullable: false, defaultValue: -1),
                    DismissText = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LayerDisclaimers", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Layers_LayerDisclaimerId",
                schema: "giframeworkmaps",
                table: "Layers",
                column: "LayerDisclaimerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Layers_LayerDisclaimers_LayerDisclaimerId",
                schema: "giframeworkmaps",
                table: "Layers",
                column: "LayerDisclaimerId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerDisclaimers",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Layers_LayerDisclaimers_LayerDisclaimerId",
                schema: "giframeworkmaps",
                table: "Layers");

            migrationBuilder.DropTable(
                name: "LayerDisclaimers",
                schema: "giframeworkmaps");

            migrationBuilder.DropIndex(
                name: "IX_Layers_LayerDisclaimerId",
                schema: "giframeworkmaps",
                table: "Layers");

            migrationBuilder.DropColumn(
                name: "LayerDisclaimerId",
                schema: "giframeworkmaps",
                table: "Layers");
        }
    }
}
