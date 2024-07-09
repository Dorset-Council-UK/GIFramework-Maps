using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddnewuniqueIDtoversioncontactstable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_VersionContact_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionContact");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VersionContact",
                schema: "giframeworkmaps",
                table: "VersionContact");

            migrationBuilder.AlterColumn<int>(
                name: "VersionId",
                schema: "giframeworkmaps",
                table: "VersionContact",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "VersionContactId",
                schema: "giframeworkmaps",
                table: "VersionContact",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddPrimaryKey(
                name: "PK_VersionContact",
                schema: "giframeworkmaps",
                table: "VersionContact",
                columns: new[] { "VersionContactId", "VersionId" });

            migrationBuilder.AddForeignKey(
                name: "FK_VersionContact_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionContact",
                column: "VersionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_VersionContact_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionContact");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VersionContact",
                schema: "giframeworkmaps",
                table: "VersionContact");

            migrationBuilder.AlterColumn<int>(
                name: "VersionId",
                schema: "giframeworkmaps",
                table: "VersionContact",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "VersionContactId",
                schema: "giframeworkmaps",
                table: "VersionContact",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.AddPrimaryKey(
                name: "PK_VersionContact",
                schema: "giframeworkmaps",
                table: "VersionContact",
                column: "VersionContactId");

            migrationBuilder.AddForeignKey(
                name: "FK_VersionContact_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionContact",
                column: "VersionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Versions",
                principalColumn: "Id");
        }
    }
}
