using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class PluralizeDbSetNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Basemap_Bound_BoundId",
                schema: "giframeworkmaps",
                table: "Basemap");

            migrationBuilder.DropForeignKey(
                name: "FK_Basemap_LayerSource_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemap");

            migrationBuilder.DropForeignKey(
                name: "FK_Category_Category_ParentCategoryId",
                schema: "giframeworkmaps",
                table: "Category");

            migrationBuilder.DropForeignKey(
                name: "FK_CategoryLayer_Category_CategoryId",
                schema: "giframeworkmaps",
                table: "CategoryLayer");

            migrationBuilder.DropForeignKey(
                name: "FK_CategoryLayer_Layer_LayerId",
                schema: "giframeworkmaps",
                table: "CategoryLayer");

            migrationBuilder.DropForeignKey(
                name: "FK_Layer_Bound_BoundId",
                schema: "giframeworkmaps",
                table: "Layer");

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
                name: "FK_VersionBasemap_Basemap_BasemapId",
                schema: "giframeworkmaps",
                table: "VersionBasemap");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionCategory_Category_CategoryId",
                schema: "giframeworkmaps",
                table: "VersionCategory");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionContact_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionContact");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionLayer_Category_CategoryId",
                schema: "giframeworkmaps",
                table: "VersionLayer");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionLayer_Layer_LayerId",
                schema: "giframeworkmaps",
                table: "VersionLayer");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionLayer_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionLayer");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionPrintConfiguration_PrintConfigurations_PrintConfigur~",
                schema: "giframeworkmaps",
                table: "VersionPrintConfiguration");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionPrintConfiguration_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionPrintConfiguration");

            migrationBuilder.DropForeignKey(
                name: "FK_Versions_Bound_BoundId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropForeignKey(
                name: "FK_Versions_Theme_ThemeId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionSearchDefinition_SearchDefinitions_SearchDefinitionId",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinition");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionSearchDefinition_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinition");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionUser_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionUser");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VersionUser",
                schema: "giframeworkmaps",
                table: "VersionUser");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VersionSearchDefinition",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinition");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VersionPrintConfiguration",
                schema: "giframeworkmaps",
                table: "VersionPrintConfiguration");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VersionLayer",
                schema: "giframeworkmaps",
                table: "VersionLayer");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VersionContact",
                schema: "giframeworkmaps",
                table: "VersionContact");

            migrationBuilder.DropPrimaryKey(
                name: "PK_TourStep",
                schema: "giframeworkmaps",
                table: "TourStep");

            migrationBuilder.DropIndex(
                name: "IX_TourStep_TourDetailsId",
                schema: "giframeworkmaps",
                table: "TourStep");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Theme",
                schema: "giframeworkmaps",
                table: "Theme");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ShortLink",
                schema: "giframeworkmaps",
                table: "ShortLink");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LayerSourceType",
                schema: "giframeworkmaps",
                table: "LayerSourceType");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LayerSourceOption",
                schema: "giframeworkmaps",
                table: "LayerSourceOption");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LayerSource",
                schema: "giframeworkmaps",
                table: "LayerSource");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Layer",
                schema: "giframeworkmaps",
                table: "Layer");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CategoryLayer",
                schema: "giframeworkmaps",
                table: "CategoryLayer");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Category",
                schema: "giframeworkmaps",
                table: "Category");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Bound",
                schema: "giframeworkmaps",
                table: "Bound");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Basemap",
                schema: "giframeworkmaps",
                table: "Basemap");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Attribution",
                schema: "giframeworkmaps",
                table: "Attribution");

            migrationBuilder.RenameTable(
                name: "VersionUser",
                schema: "giframeworkmaps",
                newName: "VersionUsers",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "VersionSearchDefinition",
                schema: "giframeworkmaps",
                newName: "VersionSearchDefinitions",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "VersionPrintConfiguration",
                schema: "giframeworkmaps",
                newName: "VersionPrintConfigurations",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "VersionLayer",
                schema: "giframeworkmaps",
                newName: "VersionLayers",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "VersionContact",
                schema: "giframeworkmaps",
                newName: "VersionContacts",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "TourStep",
                schema: "giframeworkmaps",
                newName: "TourSteps",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Theme",
                schema: "giframeworkmaps",
                newName: "Themes",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "ShortLink",
                schema: "giframeworkmaps",
                newName: "ShortLinks",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "LayerSourceType",
                schema: "giframeworkmaps",
                newName: "LayerSourceTypes",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "LayerSourceOption",
                schema: "giframeworkmaps",
                newName: "LayerSourceOptions",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "LayerSource",
                schema: "giframeworkmaps",
                newName: "LayerSources",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Layer",
                schema: "giframeworkmaps",
                newName: "Layers",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "CategoryLayer",
                schema: "giframeworkmaps",
                newName: "CategoryLayers",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Category",
                schema: "giframeworkmaps",
                newName: "Categories",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Bound",
                schema: "giframeworkmaps",
                newName: "Bounds",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Basemap",
                schema: "giframeworkmaps",
                newName: "Basemaps",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Attribution",
                schema: "giframeworkmaps",
                newName: "Attributions",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameIndex(
                name: "IX_VersionUser_VersionId",
                schema: "giframeworkmaps",
                table: "VersionUsers",
                newName: "IX_VersionUsers_VersionId");

            migrationBuilder.RenameIndex(
                name: "IX_VersionSearchDefinition_VersionId",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinitions",
                newName: "IX_VersionSearchDefinitions_VersionId");

            migrationBuilder.RenameIndex(
                name: "IX_VersionPrintConfiguration_VersionId",
                schema: "giframeworkmaps",
                table: "VersionPrintConfigurations",
                newName: "IX_VersionPrintConfigurations_VersionId");

            migrationBuilder.RenameIndex(
                name: "IX_VersionLayer_VersionId",
                schema: "giframeworkmaps",
                table: "VersionLayers",
                newName: "IX_VersionLayers_VersionId");

            migrationBuilder.RenameIndex(
                name: "IX_VersionLayer_LayerId_VersionId",
                schema: "giframeworkmaps",
                table: "VersionLayers",
                newName: "IX_VersionLayers_LayerId_VersionId");

            migrationBuilder.RenameIndex(
                name: "IX_VersionLayer_CategoryId",
                schema: "giframeworkmaps",
                table: "VersionLayers",
                newName: "IX_VersionLayers_CategoryId");

            migrationBuilder.RenameIndex(
                name: "IX_VersionContact_VersionId",
                schema: "giframeworkmaps",
                table: "VersionContacts",
                newName: "IX_VersionContacts_VersionId");

            migrationBuilder.RenameIndex(
                name: "IX_LayerSourceOption_LayerSourceId",
                schema: "giframeworkmaps",
                table: "LayerSourceOptions",
                newName: "IX_LayerSourceOptions_LayerSourceId");

            migrationBuilder.RenameIndex(
                name: "IX_LayerSource_LayerSourceTypeId",
                schema: "giframeworkmaps",
                table: "LayerSources",
                newName: "IX_LayerSources_LayerSourceTypeId");

            migrationBuilder.RenameIndex(
                name: "IX_LayerSource_AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSources",
                newName: "IX_LayerSources_AttributionId");

            migrationBuilder.RenameIndex(
                name: "IX_Layer_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Layers",
                newName: "IX_Layers_LayerSourceId");

            migrationBuilder.RenameIndex(
                name: "IX_Layer_BoundId",
                schema: "giframeworkmaps",
                table: "Layers",
                newName: "IX_Layers_BoundId");

            migrationBuilder.RenameIndex(
                name: "IX_CategoryLayer_LayerId",
                schema: "giframeworkmaps",
                table: "CategoryLayers",
                newName: "IX_CategoryLayers_LayerId");

            migrationBuilder.RenameIndex(
                name: "IX_Category_ParentCategoryId",
                schema: "giframeworkmaps",
                table: "Categories",
                newName: "IX_Categories_ParentCategoryId");

            migrationBuilder.RenameIndex(
                name: "IX_Basemap_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemaps",
                newName: "IX_Basemaps_LayerSourceId");

            migrationBuilder.RenameIndex(
                name: "IX_Basemap_BoundId",
                schema: "giframeworkmaps",
                table: "Basemaps",
                newName: "IX_Basemaps_BoundId");

            migrationBuilder.AddColumn<int>(
                name: "TourDetailId",
                schema: "giframeworkmaps",
                table: "TourSteps",
                type: "integer",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_VersionUsers",
                schema: "giframeworkmaps",
                table: "VersionUsers",
                columns: new[] { "UserId", "VersionId" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_VersionSearchDefinitions",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinitions",
                columns: new[] { "SearchDefinitionId", "VersionId" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_VersionPrintConfigurations",
                schema: "giframeworkmaps",
                table: "VersionPrintConfigurations",
                columns: new[] { "PrintConfigurationId", "VersionId" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_VersionLayers",
                schema: "giframeworkmaps",
                table: "VersionLayers",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_VersionContacts",
                schema: "giframeworkmaps",
                table: "VersionContacts",
                columns: new[] { "VersionContactId", "VersionId" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_TourSteps",
                schema: "giframeworkmaps",
                table: "TourSteps",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Themes",
                schema: "giframeworkmaps",
                table: "Themes",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ShortLinks",
                schema: "giframeworkmaps",
                table: "ShortLinks",
                column: "ShortId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LayerSourceTypes",
                schema: "giframeworkmaps",
                table: "LayerSourceTypes",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LayerSourceOptions",
                schema: "giframeworkmaps",
                table: "LayerSourceOptions",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LayerSources",
                schema: "giframeworkmaps",
                table: "LayerSources",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Layers",
                schema: "giframeworkmaps",
                table: "Layers",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CategoryLayers",
                schema: "giframeworkmaps",
                table: "CategoryLayers",
                columns: new[] { "CategoryId", "LayerId" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_Categories",
                schema: "giframeworkmaps",
                table: "Categories",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Bounds",
                schema: "giframeworkmaps",
                table: "Bounds",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Basemaps",
                schema: "giframeworkmaps",
                table: "Basemaps",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Attributions",
                schema: "giframeworkmaps",
                table: "Attributions",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_TourSteps_TourDetailId",
                schema: "giframeworkmaps",
                table: "TourSteps",
                column: "TourDetailId");

            migrationBuilder.AddForeignKey(
                name: "FK_Basemaps_Bounds_BoundId",
                schema: "giframeworkmaps",
                table: "Basemaps",
                column: "BoundId",
                principalSchema: "giframeworkmaps",
                principalTable: "Bounds",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Basemaps_LayerSources_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemaps",
                column: "LayerSourceId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerSources",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Categories_Categories_ParentCategoryId",
                schema: "giframeworkmaps",
                table: "Categories",
                column: "ParentCategoryId",
                principalSchema: "giframeworkmaps",
                principalTable: "Categories",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CategoryLayers_Categories_CategoryId",
                schema: "giframeworkmaps",
                table: "CategoryLayers",
                column: "CategoryId",
                principalSchema: "giframeworkmaps",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CategoryLayers_Layers_LayerId",
                schema: "giframeworkmaps",
                table: "CategoryLayers",
                column: "LayerId",
                principalSchema: "giframeworkmaps",
                principalTable: "Layers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Layers_Bounds_BoundId",
                schema: "giframeworkmaps",
                table: "Layers",
                column: "BoundId",
                principalSchema: "giframeworkmaps",
                principalTable: "Bounds",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Layers_LayerSources_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Layers",
                column: "LayerSourceId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerSources",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LayerSourceOptions_LayerSources_LayerSourceId",
                schema: "giframeworkmaps",
                table: "LayerSourceOptions",
                column: "LayerSourceId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerSources",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LayerSources_Attributions_AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSources",
                column: "AttributionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Attributions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_LayerSources_LayerSourceTypes_LayerSourceTypeId",
                schema: "giframeworkmaps",
                table: "LayerSources",
                column: "LayerSourceTypeId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerSourceTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_TourSteps_TourDetails_TourDetailId",
                schema: "giframeworkmaps",
                table: "TourSteps",
                column: "TourDetailId",
                principalSchema: "giframeworkmaps",
                principalTable: "TourDetails",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_VersionBasemap_Basemaps_BasemapId",
                schema: "giframeworkmaps",
                table: "VersionBasemap",
                column: "BasemapId",
                principalSchema: "giframeworkmaps",
                principalTable: "Basemaps",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionCategory_Categories_CategoryId",
                schema: "giframeworkmaps",
                table: "VersionCategory",
                column: "CategoryId",
                principalSchema: "giframeworkmaps",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionContacts_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionContacts",
                column: "VersionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionLayers_Categories_CategoryId",
                schema: "giframeworkmaps",
                table: "VersionLayers",
                column: "CategoryId",
                principalSchema: "giframeworkmaps",
                principalTable: "Categories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionLayers_Layers_LayerId",
                schema: "giframeworkmaps",
                table: "VersionLayers",
                column: "LayerId",
                principalSchema: "giframeworkmaps",
                principalTable: "Layers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionLayers_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionLayers",
                column: "VersionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionPrintConfigurations_PrintConfigurations_PrintConfigu~",
                schema: "giframeworkmaps",
                table: "VersionPrintConfigurations",
                column: "PrintConfigurationId",
                principalSchema: "giframeworkmaps",
                principalTable: "PrintConfigurations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionPrintConfigurations_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionPrintConfigurations",
                column: "VersionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Versions_Bounds_BoundId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "BoundId",
                principalSchema: "giframeworkmaps",
                principalTable: "Bounds",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Versions_Themes_ThemeId",
                schema: "giframeworkmaps",
                table: "Versions",
                column: "ThemeId",
                principalSchema: "giframeworkmaps",
                principalTable: "Themes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionSearchDefinitions_SearchDefinitions_SearchDefinition~",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinitions",
                column: "SearchDefinitionId",
                principalSchema: "giframeworkmaps",
                principalTable: "SearchDefinitions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionSearchDefinitions_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinitions",
                column: "VersionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionUsers_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionUsers",
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
                name: "FK_Basemaps_Bounds_BoundId",
                schema: "giframeworkmaps",
                table: "Basemaps");

            migrationBuilder.DropForeignKey(
                name: "FK_Basemaps_LayerSources_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemaps");

            migrationBuilder.DropForeignKey(
                name: "FK_Categories_Categories_ParentCategoryId",
                schema: "giframeworkmaps",
                table: "Categories");

            migrationBuilder.DropForeignKey(
                name: "FK_CategoryLayers_Categories_CategoryId",
                schema: "giframeworkmaps",
                table: "CategoryLayers");

            migrationBuilder.DropForeignKey(
                name: "FK_CategoryLayers_Layers_LayerId",
                schema: "giframeworkmaps",
                table: "CategoryLayers");

            migrationBuilder.DropForeignKey(
                name: "FK_Layers_Bounds_BoundId",
                schema: "giframeworkmaps",
                table: "Layers");

            migrationBuilder.DropForeignKey(
                name: "FK_Layers_LayerSources_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Layers");

            migrationBuilder.DropForeignKey(
                name: "FK_LayerSourceOptions_LayerSources_LayerSourceId",
                schema: "giframeworkmaps",
                table: "LayerSourceOptions");

            migrationBuilder.DropForeignKey(
                name: "FK_LayerSources_Attributions_AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSources");

            migrationBuilder.DropForeignKey(
                name: "FK_LayerSources_LayerSourceTypes_LayerSourceTypeId",
                schema: "giframeworkmaps",
                table: "LayerSources");

            migrationBuilder.DropForeignKey(
                name: "FK_TourSteps_TourDetails_TourDetailId",
                schema: "giframeworkmaps",
                table: "TourSteps");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionBasemap_Basemaps_BasemapId",
                schema: "giframeworkmaps",
                table: "VersionBasemap");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionCategory_Categories_CategoryId",
                schema: "giframeworkmaps",
                table: "VersionCategory");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionContacts_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionContacts");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionLayers_Categories_CategoryId",
                schema: "giframeworkmaps",
                table: "VersionLayers");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionLayers_Layers_LayerId",
                schema: "giframeworkmaps",
                table: "VersionLayers");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionLayers_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionLayers");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionPrintConfigurations_PrintConfigurations_PrintConfigu~",
                schema: "giframeworkmaps",
                table: "VersionPrintConfigurations");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionPrintConfigurations_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionPrintConfigurations");

            migrationBuilder.DropForeignKey(
                name: "FK_Versions_Bounds_BoundId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropForeignKey(
                name: "FK_Versions_Themes_ThemeId",
                schema: "giframeworkmaps",
                table: "Versions");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionSearchDefinitions_SearchDefinitions_SearchDefinition~",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinitions");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionSearchDefinitions_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinitions");

            migrationBuilder.DropForeignKey(
                name: "FK_VersionUsers_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionUsers");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VersionUsers",
                schema: "giframeworkmaps",
                table: "VersionUsers");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VersionSearchDefinitions",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinitions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VersionPrintConfigurations",
                schema: "giframeworkmaps",
                table: "VersionPrintConfigurations");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VersionLayers",
                schema: "giframeworkmaps",
                table: "VersionLayers");

            migrationBuilder.DropPrimaryKey(
                name: "PK_VersionContacts",
                schema: "giframeworkmaps",
                table: "VersionContacts");

            migrationBuilder.DropPrimaryKey(
                name: "PK_TourSteps",
                schema: "giframeworkmaps",
                table: "TourSteps");

            migrationBuilder.DropIndex(
                name: "IX_TourSteps_TourDetailId",
                schema: "giframeworkmaps",
                table: "TourSteps");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Themes",
                schema: "giframeworkmaps",
                table: "Themes");

            migrationBuilder.DropPrimaryKey(
                name: "PK_ShortLinks",
                schema: "giframeworkmaps",
                table: "ShortLinks");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LayerSourceTypes",
                schema: "giframeworkmaps",
                table: "LayerSourceTypes");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LayerSources",
                schema: "giframeworkmaps",
                table: "LayerSources");

            migrationBuilder.DropPrimaryKey(
                name: "PK_LayerSourceOptions",
                schema: "giframeworkmaps",
                table: "LayerSourceOptions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Layers",
                schema: "giframeworkmaps",
                table: "Layers");

            migrationBuilder.DropPrimaryKey(
                name: "PK_CategoryLayers",
                schema: "giframeworkmaps",
                table: "CategoryLayers");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Categories",
                schema: "giframeworkmaps",
                table: "Categories");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Bounds",
                schema: "giframeworkmaps",
                table: "Bounds");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Basemaps",
                schema: "giframeworkmaps",
                table: "Basemaps");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Attributions",
                schema: "giframeworkmaps",
                table: "Attributions");

            migrationBuilder.DropColumn(
                name: "TourDetailId",
                schema: "giframeworkmaps",
                table: "TourSteps");

            migrationBuilder.RenameTable(
                name: "VersionUsers",
                schema: "giframeworkmaps",
                newName: "VersionUser",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "VersionSearchDefinitions",
                schema: "giframeworkmaps",
                newName: "VersionSearchDefinition",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "VersionPrintConfigurations",
                schema: "giframeworkmaps",
                newName: "VersionPrintConfiguration",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "VersionLayers",
                schema: "giframeworkmaps",
                newName: "VersionLayer",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "VersionContacts",
                schema: "giframeworkmaps",
                newName: "VersionContact",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "TourSteps",
                schema: "giframeworkmaps",
                newName: "TourStep",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Themes",
                schema: "giframeworkmaps",
                newName: "Theme",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "ShortLinks",
                schema: "giframeworkmaps",
                newName: "ShortLink",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "LayerSourceTypes",
                schema: "giframeworkmaps",
                newName: "LayerSourceType",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "LayerSources",
                schema: "giframeworkmaps",
                newName: "LayerSource",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "LayerSourceOptions",
                schema: "giframeworkmaps",
                newName: "LayerSourceOption",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Layers",
                schema: "giframeworkmaps",
                newName: "Layer",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "CategoryLayers",
                schema: "giframeworkmaps",
                newName: "CategoryLayer",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Categories",
                schema: "giframeworkmaps",
                newName: "Category",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Bounds",
                schema: "giframeworkmaps",
                newName: "Bound",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Basemaps",
                schema: "giframeworkmaps",
                newName: "Basemap",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameTable(
                name: "Attributions",
                schema: "giframeworkmaps",
                newName: "Attribution",
                newSchema: "giframeworkmaps");

            migrationBuilder.RenameIndex(
                name: "IX_VersionUsers_VersionId",
                schema: "giframeworkmaps",
                table: "VersionUser",
                newName: "IX_VersionUser_VersionId");

            migrationBuilder.RenameIndex(
                name: "IX_VersionSearchDefinitions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinition",
                newName: "IX_VersionSearchDefinition_VersionId");

            migrationBuilder.RenameIndex(
                name: "IX_VersionPrintConfigurations_VersionId",
                schema: "giframeworkmaps",
                table: "VersionPrintConfiguration",
                newName: "IX_VersionPrintConfiguration_VersionId");

            migrationBuilder.RenameIndex(
                name: "IX_VersionLayers_VersionId",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                newName: "IX_VersionLayer_VersionId");

            migrationBuilder.RenameIndex(
                name: "IX_VersionLayers_LayerId_VersionId",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                newName: "IX_VersionLayer_LayerId_VersionId");

            migrationBuilder.RenameIndex(
                name: "IX_VersionLayers_CategoryId",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                newName: "IX_VersionLayer_CategoryId");

            migrationBuilder.RenameIndex(
                name: "IX_VersionContacts_VersionId",
                schema: "giframeworkmaps",
                table: "VersionContact",
                newName: "IX_VersionContact_VersionId");

            migrationBuilder.RenameIndex(
                name: "IX_LayerSources_LayerSourceTypeId",
                schema: "giframeworkmaps",
                table: "LayerSource",
                newName: "IX_LayerSource_LayerSourceTypeId");

            migrationBuilder.RenameIndex(
                name: "IX_LayerSources_AttributionId",
                schema: "giframeworkmaps",
                table: "LayerSource",
                newName: "IX_LayerSource_AttributionId");

            migrationBuilder.RenameIndex(
                name: "IX_LayerSourceOptions_LayerSourceId",
                schema: "giframeworkmaps",
                table: "LayerSourceOption",
                newName: "IX_LayerSourceOption_LayerSourceId");

            migrationBuilder.RenameIndex(
                name: "IX_Layers_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Layer",
                newName: "IX_Layer_LayerSourceId");

            migrationBuilder.RenameIndex(
                name: "IX_Layers_BoundId",
                schema: "giframeworkmaps",
                table: "Layer",
                newName: "IX_Layer_BoundId");

            migrationBuilder.RenameIndex(
                name: "IX_CategoryLayers_LayerId",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                newName: "IX_CategoryLayer_LayerId");

            migrationBuilder.RenameIndex(
                name: "IX_Categories_ParentCategoryId",
                schema: "giframeworkmaps",
                table: "Category",
                newName: "IX_Category_ParentCategoryId");

            migrationBuilder.RenameIndex(
                name: "IX_Basemaps_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemap",
                newName: "IX_Basemap_LayerSourceId");

            migrationBuilder.RenameIndex(
                name: "IX_Basemaps_BoundId",
                schema: "giframeworkmaps",
                table: "Basemap",
                newName: "IX_Basemap_BoundId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_VersionUser",
                schema: "giframeworkmaps",
                table: "VersionUser",
                columns: new[] { "UserId", "VersionId" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_VersionSearchDefinition",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinition",
                columns: new[] { "SearchDefinitionId", "VersionId" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_VersionPrintConfiguration",
                schema: "giframeworkmaps",
                table: "VersionPrintConfiguration",
                columns: new[] { "PrintConfigurationId", "VersionId" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_VersionLayer",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_VersionContact",
                schema: "giframeworkmaps",
                table: "VersionContact",
                columns: new[] { "VersionContactId", "VersionId" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_TourStep",
                schema: "giframeworkmaps",
                table: "TourStep",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Theme",
                schema: "giframeworkmaps",
                table: "Theme",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_ShortLink",
                schema: "giframeworkmaps",
                table: "ShortLink",
                column: "ShortId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LayerSourceType",
                schema: "giframeworkmaps",
                table: "LayerSourceType",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LayerSource",
                schema: "giframeworkmaps",
                table: "LayerSource",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_LayerSourceOption",
                schema: "giframeworkmaps",
                table: "LayerSourceOption",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Layer",
                schema: "giframeworkmaps",
                table: "Layer",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_CategoryLayer",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                columns: new[] { "CategoryId", "LayerId" });

            migrationBuilder.AddPrimaryKey(
                name: "PK_Category",
                schema: "giframeworkmaps",
                table: "Category",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Bound",
                schema: "giframeworkmaps",
                table: "Bound",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Basemap",
                schema: "giframeworkmaps",
                table: "Basemap",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Attribution",
                schema: "giframeworkmaps",
                table: "Attribution",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_TourStep_TourDetailsId",
                schema: "giframeworkmaps",
                table: "TourStep",
                column: "TourDetailsId");

            migrationBuilder.AddForeignKey(
                name: "FK_Basemap_Bound_BoundId",
                schema: "giframeworkmaps",
                table: "Basemap",
                column: "BoundId",
                principalSchema: "giframeworkmaps",
                principalTable: "Bound",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Basemap_LayerSource_LayerSourceId",
                schema: "giframeworkmaps",
                table: "Basemap",
                column: "LayerSourceId",
                principalSchema: "giframeworkmaps",
                principalTable: "LayerSource",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Category_Category_ParentCategoryId",
                schema: "giframeworkmaps",
                table: "Category",
                column: "ParentCategoryId",
                principalSchema: "giframeworkmaps",
                principalTable: "Category",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_CategoryLayer_Category_CategoryId",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                column: "CategoryId",
                principalSchema: "giframeworkmaps",
                principalTable: "Category",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CategoryLayer_Layer_LayerId",
                schema: "giframeworkmaps",
                table: "CategoryLayer",
                column: "LayerId",
                principalSchema: "giframeworkmaps",
                principalTable: "Layer",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Layer_Bound_BoundId",
                schema: "giframeworkmaps",
                table: "Layer",
                column: "BoundId",
                principalSchema: "giframeworkmaps",
                principalTable: "Bound",
                principalColumn: "Id");

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
                name: "FK_VersionBasemap_Basemap_BasemapId",
                schema: "giframeworkmaps",
                table: "VersionBasemap",
                column: "BasemapId",
                principalSchema: "giframeworkmaps",
                principalTable: "Basemap",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionCategory_Category_CategoryId",
                schema: "giframeworkmaps",
                table: "VersionCategory",
                column: "CategoryId",
                principalSchema: "giframeworkmaps",
                principalTable: "Category",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionContact_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionContact",
                column: "VersionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionLayer_Category_CategoryId",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                column: "CategoryId",
                principalSchema: "giframeworkmaps",
                principalTable: "Category",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionLayer_Layer_LayerId",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                column: "LayerId",
                principalSchema: "giframeworkmaps",
                principalTable: "Layer",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionLayer_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionLayer",
                column: "VersionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionPrintConfiguration_PrintConfigurations_PrintConfigur~",
                schema: "giframeworkmaps",
                table: "VersionPrintConfiguration",
                column: "PrintConfigurationId",
                principalSchema: "giframeworkmaps",
                principalTable: "PrintConfigurations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionPrintConfiguration_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionPrintConfiguration",
                column: "VersionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Versions",
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

            migrationBuilder.AddForeignKey(
                name: "FK_VersionSearchDefinition_SearchDefinitions_SearchDefinitionId",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinition",
                column: "SearchDefinitionId",
                principalSchema: "giframeworkmaps",
                principalTable: "SearchDefinitions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionSearchDefinition_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionSearchDefinition",
                column: "VersionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_VersionUser_Versions_VersionId",
                schema: "giframeworkmaps",
                table: "VersionUser",
                column: "VersionId",
                principalSchema: "giframeworkmaps",
                principalTable: "Versions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
