using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddShortLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Layer_LayerSource_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Layer");

            migrationBuilder.DropForeignKey(
                name: "FK_LayerSource_Attribution_AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSource");

            migrationBuilder.DropForeignKey(
                name: "FK_LayerSource_LayerSourceType_LayerSourceTypeId",
                schema: "giframeworkmaps",
                table: "LayerSource");

            migrationBuilder.DropForeignKey(
                name: "FK_LayerSourceOption_LayerSource_LayerSourceId",
                schema: "giframeworkmaps",
                table: "LayerSourceOption");

            migrationBuilder.DropForeignKey(
                name: "FK_TourStep_TourDetails_TourDetailsId",
                schema: "giframeworkmaps",
                table: "TourStep");

            migrationBuilder.DropForeignKey(
                name: "FK_Versions_Bound_BoundId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropForeignKey(
                name: "FK_Versions_Theme_ThemeId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                schema: "giframeworkmaps",
                table: "WelcomeMessages",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "giframeworkmaps",
                table: "WelcomeMessages",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                schema: "giframeworkmaps",
                table: "WelcomeMessages",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ThemeId",
                schema: "giframeworkmaps",
                table: "Versions",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Slug",
                schema: "giframeworkmaps",
                table: "Versions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "giframeworkmaps",
                table: "Versions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "BoundId",
                schema: "giframeworkmaps",
                table: "Versions",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "TourDetailsId",
                schema: "giframeworkmaps",
                table: "TourStep",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "PrimaryColour",
                schema: "giframeworkmaps",
                table: "Theme",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "giframeworkmaps",
                table: "Theme",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "giframeworkmaps",
                table: "Theme",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "LayerSourceId",
                schema: "giframeworkmaps",
                table: "LayerSourceOption",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "LayerSourceTypeId",
                schema: "giframeworkmaps",
                table: "LayerSource",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSource",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "LayerSourceId",
                schema: "giframeworkmaps",
                table: "Layer",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "giframeworkmaps",
                table: "Bound",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "giframeworkmaps",
                table: "Bound",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "giframeworkmaps",
                table: "Attribution",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "AttributionHTML",
                schema: "giframeworkmaps",
                table: "Attribution",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "ShortLink",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    ShortId = table.Column<string>(type: "text", nullable: false),
                    FullUrl = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShortLink", x => x.ShortId);
                });

            migrationBuilder.AddForeignKey(
                name: "FK_Layer_LayerSource_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Layer",
                column: "LayerSourceId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerSource",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LayerSource_Attribution_AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSource",
                column: "AttributionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Attribution",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LayerSource_LayerSourceType_LayerSourceTypeId",
                schema: "giframeworkmaps",
                table: "LayerSource",
                column: "LayerSourceTypeId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerSourceType",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LayerSourceOption_LayerSource_LayerSourceId",
                schema: "giframeworkmaps",
                table: "LayerSourceOption",
                column: "LayerSourceId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerSource",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_TourStep_TourDetails_TourDetailsId",
                schema: "giframeworkmaps",
                table: "TourStep",
                column: "TourDetailsId",
                principalSchema: "giframeworkmaps",
                principalTable: "TourDetails",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Versions_Bound_BoundId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "BoundId",
                principalSchema: "giframeworkmaps",
                principalTable: "Bound",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Versions_Theme_ThemeId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "ThemeId",
                principalSchema: "giframeworkmaps",
                principalTable: "Theme",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Layer_LayerSource_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Layer");

            migrationBuilder.DropForeignKey(
                name: "FK_LayerSource_Attribution_AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSource");

            migrationBuilder.DropForeignKey(
                name: "FK_LayerSource_LayerSourceType_LayerSourceTypeId",
                schema: "giframeworkmaps",
                table: "LayerSource");

            migrationBuilder.DropForeignKey(
                name: "FK_LayerSourceOption_LayerSource_LayerSourceId",
                schema: "giframeworkmaps",
                table: "LayerSourceOption");

            migrationBuilder.DropForeignKey(
                name: "FK_TourStep_TourDetails_TourDetailsId",
                schema: "giframeworkmaps",
                table: "TourStep");

            migrationBuilder.DropForeignKey(
                name: "FK_Versions_Bound_BoundId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropForeignKey(
                name: "FK_Versions_Theme_ThemeId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropTable(
                name: "ShortLink",
                schema: "giframeworkmaps");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                schema: "giframeworkmaps",
                table: "WelcomeMessages",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "giframeworkmaps",
                table: "WelcomeMessages",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Content",
                schema: "giframeworkmaps",
                table: "WelcomeMessages",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<int>(
                name: "ThemeId",
                schema: "giframeworkmaps",
                table: "Versions",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "Slug",
                schema: "giframeworkmaps",
                table: "Versions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "giframeworkmaps",
                table: "Versions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<int>(
                name: "BoundId",
                schema: "giframeworkmaps",
                table: "Versions",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "TourDetailsId",
                schema: "giframeworkmaps",
                table: "TourStep",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "PrimaryColour",
                schema: "giframeworkmaps",
                table: "Theme",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "giframeworkmaps",
                table: "Theme",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "giframeworkmaps",
                table: "Theme",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<int>(
                name: "LayerSourceId",
                schema: "giframeworkmaps",
                table: "LayerSourceOption",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "LayerSourceTypeId",
                schema: "giframeworkmaps",
                table: "LayerSource",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSource",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<int>(
                name: "LayerSourceId",
                schema: "giframeworkmaps",
                table: "Layer",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "giframeworkmaps",
                table: "Bound",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "giframeworkmaps",
                table: "Bound",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "giframeworkmaps",
                table: "Attribution",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "AttributionHTML",
                schema: "giframeworkmaps",
                table: "Attribution",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddForeignKey(
                name: "FK_Layer_LayerSource_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Layer",
                column: "LayerSourceId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerSource",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_LayerSource_Attribution_AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSource",
                column: "AttributionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Attribution",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_LayerSource_LayerSourceType_LayerSourceTypeId",
                schema: "giframeworkmaps",
                table: "LayerSource",
                column: "LayerSourceTypeId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerSourceType",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_LayerSourceOption_LayerSource_LayerSourceId",
                schema: "giframeworkmaps",
                table: "LayerSourceOption",
                column: "LayerSourceId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerSource",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_TourStep_TourDetails_TourDetailsId",
                schema: "giframeworkmaps",
                table: "TourStep",
                column: "TourDetailsId",
                principalSchema: "giframeworkmaps",
                principalTable: "TourDetails",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Versions_Bound_BoundId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "BoundId",
                principalSchema: "giframeworkmaps",
                principalTable: "Bound",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Versions_Theme_ThemeId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "ThemeId",
                principalSchema: "giframeworkmaps",
                principalTable: "Theme",
                principalColumn: "Id");
        }
    }
}
