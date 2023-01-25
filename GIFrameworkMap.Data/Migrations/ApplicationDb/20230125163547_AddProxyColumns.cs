using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddProxyColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ProxyMapRequests",
                schema: "giframeworkmaps",
                table: "WebLayerServiceDefinitions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ProxyMetaRequests",
                schema: "giframeworkmaps",
                table: "WebLayerServiceDefinitions",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ProxyMapRequests",
                schema: "giframeworkmaps",
                table: "Layer",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ProxyMetaRequests",
                schema: "giframeworkmaps",
                table: "Layer",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProxyMapRequests",
                schema: "giframeworkmaps",
                table: "WebLayerServiceDefinitions");

            migrationBuilder.DropColumn(
                name: "ProxyMetaRequests",
                schema: "giframeworkmaps",
                table: "WebLayerServiceDefinitions");

            migrationBuilder.DropColumn(
                name: "ProxyMapRequests",
                schema: "giframeworkmaps",
                table: "Layer");

            migrationBuilder.DropColumn(
                name: "ProxyMetaRequests",
                schema: "giframeworkmaps",
                table: "Layer");
        }
    }
}
