using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddVersionEmailBasedAuthorization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VersionEmailBasedAuthorizations",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    VersionId = table.Column<int>(type: "integer", nullable: false),
                    EmailRegEx = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VersionEmailBasedAuthorizations", x => new { x.EmailRegEx, x.VersionId });
                    table.ForeignKey(
                        name: "FK_VersionEmailBasedAuthorizations_Versions_VersionId",
                        column: x => x.VersionId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Versions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VersionEmailBasedAuthorizations_VersionId",
                schema: "giframeworkmaps",
                table: "VersionEmailBasedAuthorizations",
                column: "VersionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VersionEmailBasedAuthorizations",
                schema: "giframeworkmaps");
        }
    }
}
