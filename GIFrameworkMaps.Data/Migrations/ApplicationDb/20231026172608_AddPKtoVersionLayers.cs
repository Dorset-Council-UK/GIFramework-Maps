using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddPKtoVersionLayers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_VersionLayer",
                schema: "giframeworkmaps",
                table: "VersionLayer");

            migrationBuilder.AlterColumn<int>(
                name: "DefaultSaturation",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "DefaultOpacity",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "Id",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                type: "integer",
                nullable: false,
                defaultValue: 0)
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddPrimaryKey(
                name: "PK_VersionLayer",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_VersionLayer_LayerId_VersionId",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                columns: new[] { "LayerId", "VersionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_VersionLayer",
                schema: "giframeworkmaps",
                table: "VersionLayer");

            migrationBuilder.DropIndex(
                name: "IX_VersionLayer_LayerId_VersionId",
                schema: "giframeworkmaps",
                table: "VersionLayer");

            migrationBuilder.DropColumn(
                name: "Id",
                schema: "giframeworkmaps",
                table: "VersionLayer");

            migrationBuilder.AlterColumn<int>(
                name: "DefaultSaturation",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "DefaultOpacity",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_VersionLayer",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                columns: new[] { "LayerId", "VersionId" });
        }
    }
}
