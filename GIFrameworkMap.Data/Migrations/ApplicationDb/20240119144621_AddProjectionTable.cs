using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddProjectionTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MapProjectionId",
                schema: "giframeworkmaps",
                table: "Versions",
                type: "integer",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Discriminator",
                schema: "giframeworkmaps",
                table: "SearchDefinitions",
                type: "character varying(34)",
                maxLength: 34,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.CreateTable(
                name: "Projections",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    EPSGCode = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    Proj4Definition = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Projections", x => x.EPSGCode);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Versions_MapProjectionId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "MapProjectionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Versions_Projections_MapProjectionId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "MapProjectionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Projections",
                principalColumn: "EPSGCode");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Versions_Projections_MapProjectionId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropTable(
                name: "Projections",
                schema: "giframeworkmaps");

            migrationBuilder.DropIndex(
                name: "IX_Versions_MapProjectionId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropColumn(
                name: "MapProjectionId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.AlterColumn<string>(
                name: "Discriminator",
                schema: "giframeworkmaps",
                table: "SearchDefinitions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(34)",
                oldMaxLength: 34);
        }
    }
}
