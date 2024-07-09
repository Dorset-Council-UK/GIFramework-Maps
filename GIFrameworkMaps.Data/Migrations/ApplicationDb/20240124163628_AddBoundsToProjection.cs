using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddBoundsToProjection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "MaxBoundX",
                schema: "giframeworkmaps",
                table: "Projections",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MaxBoundY",
                schema: "giframeworkmaps",
                table: "Projections",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MinBoundX",
                schema: "giframeworkmaps",
                table: "Projections",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "MinBoundY",
                schema: "giframeworkmaps",
                table: "Projections",
                type: "numeric",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxBoundX",
                schema: "giframeworkmaps",
                table: "Projections");

            migrationBuilder.DropColumn(
                name: "MaxBoundY",
                schema: "giframeworkmaps",
                table: "Projections");

            migrationBuilder.DropColumn(
                name: "MinBoundX",
                schema: "giframeworkmaps",
                table: "Projections");

            migrationBuilder.DropColumn(
                name: "MinBoundY",
                schema: "giframeworkmaps",
                table: "Projections");
        }
    }
}
