using GIFrameworkMaps.Data.Models.Authorization;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddURLAuthorizationRulesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:authorization_type", "bearer,none");

            migrationBuilder.AlterColumn<string>(
                name: "DismissText",
                schema: "giframeworkmaps",
                table: "LayerDisclaimers",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "URLAuthorizationRules",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Url = table.Column<string>(type: "text", nullable: false),
                    Priority = table.Column<int>(type: "integer", nullable: false),
                    AuthorizationType = table.Column<AuthorizationType>(type: "authorization_type", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_URLAuthorizationRules", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "URLAuthorizationRules",
                schema: "giframeworkmaps");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:Enum:authorization_type", "bearer,none");

            migrationBuilder.AlterColumn<string>(
                name: "DismissText",
                schema: "giframeworkmaps",
                table: "LayerDisclaimers",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);
        }
    }
}
