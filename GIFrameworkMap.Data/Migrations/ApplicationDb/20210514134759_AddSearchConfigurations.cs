using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddSearchConfigurations : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SearchDefinitions",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    AttributionHtml = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    MaxResults = table.Column<int>(type: "integer", nullable: true),
                    ZoomLevel = table.Column<int>(type: "integer", nullable: true),
                    EPSG = table.Column<int>(type: "integer", nullable: false),
                    ValidationRegex = table.Column<string>(type: "text", nullable: true),
                    SupressGeom = table.Column<bool>(type: "boolean", nullable: false),
                    Discriminator = table.Column<string>(type: "text", nullable: false),
                    URLTemplate = table.Column<string>(type: "text", nullable: true),
                    XFieldPath = table.Column<string>(type: "text", nullable: true),
                    YFieldPath = table.Column<string>(type: "text", nullable: true),
                    TitleFieldPath = table.Column<string>(type: "text", nullable: true),
                    GeomFieldPath = table.Column<string>(type: "text", nullable: true),
                    TableName = table.Column<string>(type: "text", nullable: true),
                    XField = table.Column<string>(type: "text", nullable: true),
                    YField = table.Column<string>(type: "text", nullable: true),
                    GeomField = table.Column<string>(type: "text", nullable: true),
                    TitleField = table.Column<string>(type: "text", nullable: true),
                    WhereClause = table.Column<string>(type: "text", nullable: true),
                    OrderByClause = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SearchDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "VersionSearchDefinition",
                schema: "giframeworkmaps",
                columns: table => new
                {
                    VersionId = table.Column<int>(type: "integer", nullable: false),
                    SearchDefinitionId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VersionSearchDefinition", x => new { x.SearchDefinitionId, x.VersionId });
                    table.ForeignKey(
                        name: "FK_VersionSearchDefinition_SearchDefinitions_SearchDefinitionId",
                        column: x => x.SearchDefinitionId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "SearchDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VersionSearchDefinition_Versions_VersionId",
                        column: x => x.VersionId,
                        principalSchema: "giframeworkmaps",
                        principalTable: "Versions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VersionSearchDefinition_VersionId",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinition",
                column: "VersionId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VersionSearchDefinition",
                schema: "giframeworkmaps");

            migrationBuilder.DropTable(
                name: "SearchDefinitions",
                schema: "giframeworkmaps");
        }
    }
}
