using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddWelcomeMessages : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "WelcomeMessageId",
                schema: "giframeworkmaps",
                table: "Versions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "WelcomeMessages",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Title = table.Column<string>(type: "text", nullable: true),
                    Content = table.Column<string>(type: "text", nullable: true),
                    Frequency = table.Column<int>(type: "integer", nullable: false, defaultValue: -1),
                    UpdateDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WelcomeMessages", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Versions_WelcomeMessageId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "WelcomeMessageId");

            migrationBuilder.AddForeignKey(
                name: "FK_Versions_WelcomeMessages_WelcomeMessageId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "WelcomeMessageId",
                principalSchema: "giframeworkmaps",
                principalTable: "WelcomeMessages",
                principalColumn: "Id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Versions_WelcomeMessages_WelcomeMessageId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropTable(
                name: "WelcomeMessages",
                schema: "giframeworkmaps");

            migrationBuilder.DropIndex(
                name: "IX_Versions_WelcomeMessageId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropColumn(
                name: "WelcomeMessageId",
                schema: "giframeworkmaps",
                table: "Versions");
        }
    }
}
