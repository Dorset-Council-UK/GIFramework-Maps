using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddTour : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_VersionUser_ApplicationUser_UserId",
                schema: "giframeworkmaps",
                table: "VersionUser");

            migrationBuilder.AddColumn<int>(
                name: "TourDetailsId",
                schema: "giframeworkmaps",
                table: "Versions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TourDetails",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Frequency = table.Column<int>(type: "integer", nullable: false, defaultValue: -1),
                    UpdateDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TourDetails", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TourStep",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    AttachToSelector = table.Column<string>(type: "text", nullable: true),
                    AttachToPosition = table.Column<string>(type: "text", nullable: true),
                    StepNumber = table.Column<int>(type: "integer", nullable: false),
                    TourDetailsId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TourStep", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TourStep_TourDetails_TourDetailsId",
                        column: x => x.TourDetailsId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "TourDetails",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Versions_TourDetailsId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "TourDetailsId");

            migrationBuilder.CreateIndex(
                name: "IX_TourStep_TourDetailsId",
                schema: "giframeworkmaps",
                table: "TourStep",
                column: "TourDetailsId");

            migrationBuilder.AddForeignKey(
                name: "FK_Versions_TourDetails_TourDetailsId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "TourDetailsId",
                principalSchema: "giframeworkmaps",
                principalTable: "TourDetails",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Versions_TourDetails_TourDetailsId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropTable(
                name: "TourStep",
                schema: "giframeworkmaps");

            migrationBuilder.DropTable(
                name: "TourDetails",
                schema: "giframeworkmaps");

            migrationBuilder.DropIndex(
                name: "IX_Versions_TourDetailsId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropColumn(
                name: "TourDetailsId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.CreateTable(
                name: "ApplicationUser",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<string>(type: "text", nullable: false),
                    AccessFailedCount = table.Column<int>(type: "integer", nullable: false),
                    ConcurrencyStamp = table.Column<string>(type: "text", nullable: true),
                    Email = table.Column<string>(type: "text", nullable: true),
                    EmailConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    FirstName = table.Column<string>(type: "text", nullable: true),
                    LastName = table.Column<string>(type: "text", nullable: true),
                    LockoutEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LockoutEnd = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    NormalizedEmail = table.Column<string>(type: "text", nullable: true),
                    NormalizedUserName = table.Column<string>(type: "text", nullable: true),
                    PasswordHash = table.Column<string>(type: "text", nullable: true),
                    PhoneNumber = table.Column<string>(type: "text", nullable: true),
                    PhoneNumberConfirmed = table.Column<bool>(type: "boolean", nullable: false),
                    SecurityStamp = table.Column<string>(type: "text", nullable: true),
                    TwoFactorEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    UserName = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ApplicationUser", x => x.Id);
                });

            migrationBuilder.AddForeignKey(
                name: "FK_VersionUser_ApplicationUser_UserId",
                schema: "giframeworkmaps",
                table: "VersionUser",
                column: "UserId",
                principalSchema: "giframeworkmaps",
                principalTable: "ApplicationUser",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
