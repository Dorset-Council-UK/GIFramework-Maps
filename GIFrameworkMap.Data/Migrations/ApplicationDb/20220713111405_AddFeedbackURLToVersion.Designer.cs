﻿// <auto-generated />
using System;
using GIFrameworkMaps.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20220713111405_AddFeedbackURLToVersion")]
    partial class AddFeedbackURLToVersion
    {
        protected override void BuildTargetModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasDefaultSchema("giframeworkmaps")
                .HasAnnotation("ProductVersion", "6.0.5")
                .HasAnnotation("Relational:MaxIdentifierLength", 63);

            NpgsqlModelBuilderExtensions.UseIdentityByDefaultColumns(modelBuilder);

            modelBuilder.Entity("GIFrameworkMaps.Data.Identity.ApplicationUser", b =>
                {
                    b.Property<string>("Id")
                        .HasColumnType("text");

                    b.Property<int>("AccessFailedCount")
                        .HasColumnType("integer");

                    b.Property<string>("ConcurrencyStamp")
                        .HasColumnType("text");

                    b.Property<string>("Email")
                        .HasColumnType("text");

                    b.Property<bool>("EmailConfirmed")
                        .HasColumnType("boolean");

                    b.Property<string>("FirstName")
                        .HasColumnType("text");

                    b.Property<string>("LastName")
                        .HasColumnType("text");

                    b.Property<bool>("LockoutEnabled")
                        .HasColumnType("boolean");

                    b.Property<DateTimeOffset?>("LockoutEnd")
                        .HasColumnType("timestamp with time zone");

                    b.Property<string>("NormalizedEmail")
                        .HasColumnType("text");

                    b.Property<string>("NormalizedUserName")
                        .HasColumnType("text");

                    b.Property<string>("PasswordHash")
                        .HasColumnType("text");

                    b.Property<string>("PhoneNumber")
                        .HasColumnType("text");

                    b.Property<bool>("PhoneNumberConfirmed")
                        .HasColumnType("boolean");

                    b.Property<string>("SecurityStamp")
                        .HasColumnType("text");

                    b.Property<bool>("TwoFactorEnabled")
                        .HasColumnType("boolean");

                    b.Property<string>("UserName")
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.ToTable("ApplicationUser", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Attribution", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<string>("AttributionHTML")
                        .HasColumnType("text");

                    b.Property<string>("Name")
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.ToTable("Attribution", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Basemap", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<int?>("BoundId")
                        .HasColumnType("integer");

                    b.Property<int?>("LayerSourceId")
                        .HasColumnType("integer");

                    b.Property<int>("MaxZoom")
                        .HasColumnType("integer");

                    b.Property<int>("MinZoom")
                        .HasColumnType("integer");

                    b.Property<string>("Name")
                        .HasMaxLength(200)
                        .HasColumnType("character varying(200)");

                    b.Property<string>("PreviewImageURL")
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.HasIndex("BoundId");

                    b.HasIndex("LayerSourceId");

                    b.ToTable("Basemap", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Bound", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<decimal>("BottomLeftX")
                        .HasColumnType("numeric");

                    b.Property<decimal>("BottomLeftY")
                        .HasColumnType("numeric");

                    b.Property<string>("Description")
                        .HasColumnType("text");

                    b.Property<string>("Name")
                        .HasMaxLength(100)
                        .HasColumnType("character varying(100)");

                    b.Property<decimal>("TopRightX")
                        .HasColumnType("numeric");

                    b.Property<decimal>("TopRightY")
                        .HasColumnType("numeric");

                    b.HasKey("Id");

                    b.ToTable("Bound", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Category", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<string>("Description")
                        .HasColumnType("text");

                    b.Property<string>("Name")
                        .HasMaxLength(200)
                        .HasColumnType("character varying(200)");

                    b.Property<int>("Order")
                        .HasColumnType("integer");

                    b.Property<int?>("ParentCategoryId")
                        .HasColumnType("integer");

                    b.HasKey("Id");

                    b.HasIndex("ParentCategoryId");

                    b.ToTable("Category", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.CategoryLayer", b =>
                {
                    b.Property<int>("CategoryId")
                        .HasColumnType("integer");

                    b.Property<int>("LayerId")
                        .HasColumnType("integer");

                    b.Property<int>("SortOrder")
                        .HasColumnType("integer");

                    b.HasKey("CategoryId", "LayerId");

                    b.HasIndex("LayerId");

                    b.ToTable("CategoryLayer", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Layer", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<int?>("BoundId")
                        .HasColumnType("integer");

                    b.Property<int>("DefaultOpacity")
                        .HasColumnType("integer");

                    b.Property<int>("DefaultSaturation")
                        .HasColumnType("integer");

                    b.Property<string>("InfoListTitleTemplate")
                        .HasColumnType("text");

                    b.Property<string>("InfoTemplate")
                        .HasColumnType("text");

                    b.Property<int?>("LayerSourceId")
                        .HasColumnType("integer");

                    b.Property<int?>("MaxZoom")
                        .HasColumnType("integer");

                    b.Property<int?>("MinZoom")
                        .HasColumnType("integer");

                    b.Property<string>("Name")
                        .HasMaxLength(200)
                        .HasColumnType("character varying(200)");

                    b.Property<bool>("Queryable")
                        .HasColumnType("boolean");

                    b.Property<int>("ZIndex")
                        .HasColumnType("integer");

                    b.HasKey("Id");

                    b.HasIndex("BoundId");

                    b.HasIndex("LayerSourceId");

                    b.ToTable("Layer", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.LayerSource", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<int?>("AttributionId")
                        .HasColumnType("integer");

                    b.Property<string>("Description")
                        .HasColumnType("text");

                    b.Property<int?>("LayerSourceTypeId")
                        .HasColumnType("integer");

                    b.Property<string>("Name")
                        .HasMaxLength(100)
                        .HasColumnType("character varying(100)");

                    b.HasKey("Id");

                    b.HasIndex("AttributionId");

                    b.HasIndex("LayerSourceTypeId");

                    b.ToTable("LayerSource", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.LayerSourceOption", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<int?>("LayerSourceId")
                        .HasColumnType("integer");

                    b.Property<string>("Name")
                        .HasMaxLength(100)
                        .HasColumnType("character varying(100)");

                    b.Property<string>("Value")
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.HasIndex("LayerSourceId");

                    b.ToTable("LayerSourceOption", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.LayerSourceType", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<string>("Description")
                        .HasColumnType("text");

                    b.Property<string>("Name")
                        .HasMaxLength(100)
                        .HasColumnType("character varying(100)");

                    b.HasKey("Id");

                    b.ToTable("LayerSourceType", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Print.PrintConfiguration", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<string>("LogoURL")
                        .HasColumnType("text");

                    b.Property<string>("Name")
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.ToTable("PrintConfigurations", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Search.DatabaseSearchResult", b =>
                {
                    b.Property<string>("GeomField")
                        .HasColumnType("text");

                    b.Property<string>("TitleField")
                        .HasColumnType("text");

                    b.Property<double?>("XField")
                        .HasColumnType("double precision");

                    b.Property<double?>("YField")
                        .HasColumnType("double precision");

                    b.ToTable("DatabaseSearchResults", "giframeworkmaps", t => t.ExcludeFromMigrations());
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Search.SearchDefinition", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<string>("AttributionHtml")
                        .HasMaxLength(1000)
                        .HasColumnType("character varying(1000)");

                    b.Property<string>("Discriminator")
                        .IsRequired()
                        .HasColumnType("text");

                    b.Property<int>("EPSG")
                        .HasColumnType("integer");

                    b.Property<int?>("MaxResults")
                        .HasColumnType("integer");

                    b.Property<string>("Name")
                        .HasMaxLength(200)
                        .HasColumnType("character varying(200)");

                    b.Property<bool>("SupressGeom")
                        .HasColumnType("boolean");

                    b.Property<string>("Title")
                        .HasMaxLength(200)
                        .HasColumnType("character varying(200)");

                    b.Property<string>("ValidationRegex")
                        .HasColumnType("text");

                    b.Property<int?>("ZoomLevel")
                        .HasColumnType("integer");

                    b.HasKey("Id");

                    b.ToTable("SearchDefinitions", "giframeworkmaps");

                    b.HasDiscriminator<string>("Discriminator").HasValue("SearchDefinition");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Theme", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<string>("CustomFaviconURL")
                        .HasColumnType("text");

                    b.Property<string>("Description")
                        .HasColumnType("text");

                    b.Property<string>("LogoURL")
                        .HasColumnType("text");

                    b.Property<string>("Name")
                        .HasMaxLength(100)
                        .HasColumnType("character varying(100)");

                    b.Property<string>("PrimaryColour")
                        .HasColumnType("text");

                    b.HasKey("Id");

                    b.ToTable("Theme", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Version", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<int?>("BoundId")
                        .HasColumnType("integer");

                    b.Property<string>("Description")
                        .HasColumnType("text");

                    b.Property<bool>("Enabled")
                        .HasColumnType("boolean");

                    b.Property<string>("FeedbackURL")
                        .HasColumnType("text");

                    b.Property<string>("HelpURL")
                        .HasColumnType("text");

                    b.Property<string>("Name")
                        .HasMaxLength(100)
                        .HasColumnType("character varying(100)");

                    b.Property<string>("RedirectionURL")
                        .HasColumnType("text");

                    b.Property<bool>("RequireLogin")
                        .HasColumnType("boolean");

                    b.Property<string>("Slug")
                        .HasMaxLength(50)
                        .HasColumnType("character varying(50)");

                    b.Property<int?>("ThemeId")
                        .HasColumnType("integer");

                    b.Property<int?>("WelcomeMessageId")
                        .HasColumnType("integer");

                    b.HasKey("Id");

                    b.HasIndex("BoundId");

                    b.HasIndex("ThemeId");

                    b.HasIndex("WelcomeMessageId");

                    b.ToTable("Versions", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.VersionBasemap", b =>
                {
                    b.Property<int>("BasemapId")
                        .HasColumnType("integer");

                    b.Property<int>("VersionId")
                        .HasColumnType("integer");

                    b.Property<int>("DefaultOpacity")
                        .HasColumnType("integer");

                    b.Property<int>("DefaultSaturation")
                        .HasColumnType("integer");

                    b.Property<bool>("IsDefault")
                        .HasColumnType("boolean");

                    b.HasKey("BasemapId", "VersionId");

                    b.HasIndex("VersionId");

                    b.ToTable("VersionBasemap", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.VersionCategory", b =>
                {
                    b.Property<int>("CategoryId")
                        .HasColumnType("integer");

                    b.Property<int>("VersionId")
                        .HasColumnType("integer");

                    b.HasKey("CategoryId", "VersionId");

                    b.HasIndex("VersionId");

                    b.ToTable("VersionCategory", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.VersionPrintConfiguration", b =>
                {
                    b.Property<int>("PrintConfigurationId")
                        .HasColumnType("integer");

                    b.Property<int>("VersionId")
                        .HasColumnType("integer");

                    b.HasKey("PrintConfigurationId", "VersionId");

                    b.HasIndex("VersionId");

                    b.ToTable("VersionPrintConfiguration", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.VersionSearchDefinition", b =>
                {
                    b.Property<int>("SearchDefinitionId")
                        .HasColumnType("integer");

                    b.Property<int>("VersionId")
                        .HasColumnType("integer");

                    b.Property<bool>("Enabled")
                        .HasColumnType("boolean");

                    b.Property<int>("Order")
                        .HasColumnType("integer");

                    b.Property<bool>("StopIfFound")
                        .HasColumnType("boolean");

                    b.HasKey("SearchDefinitionId", "VersionId");

                    b.HasIndex("VersionId");

                    b.ToTable("VersionSearchDefinition", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.VersionUser", b =>
                {
                    b.Property<string>("UserId")
                        .HasColumnType("text");

                    b.Property<int>("VersionId")
                        .HasColumnType("integer");

                    b.HasKey("UserId", "VersionId");

                    b.HasIndex("VersionId");

                    b.ToTable("VersionUser", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.WelcomeMessage", b =>
                {
                    b.Property<int>("Id")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer");

                    NpgsqlPropertyBuilderExtensions.UseIdentityByDefaultColumn(b.Property<int>("Id"));

                    b.Property<string>("Content")
                        .HasColumnType("text");

                    b.Property<bool>("DismissOnButtonOnly")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("boolean")
                        .HasDefaultValue(false);

                    b.Property<string>("DismissText")
                        .HasColumnType("text");

                    b.Property<int>("Frequency")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("integer")
                        .HasDefaultValue(-1);

                    b.Property<string>("Name")
                        .HasMaxLength(100)
                        .HasColumnType("character varying(100)");

                    b.Property<string>("Title")
                        .HasColumnType("text");

                    b.Property<DateTime>("UpdateDate")
                        .HasColumnType("timestamp with time zone");

                    b.HasKey("Id");

                    b.ToTable("WelcomeMessages", "giframeworkmaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Search.APISearchDefinition", b =>
                {
                    b.HasBaseType("GIFrameworkMaps.Data.Models.Search.SearchDefinition");

                    b.Property<string>("GeomFieldPath")
                        .HasColumnType("text");

                    b.Property<string>("MBRXMaxPath")
                        .HasColumnType("text");

                    b.Property<string>("MBRXMinPath")
                        .HasColumnType("text");

                    b.Property<string>("MBRYMaxPath")
                        .HasColumnType("text");

                    b.Property<string>("MBRYMinPath")
                        .HasColumnType("text");

                    b.Property<string>("TitleFieldPath")
                        .HasColumnType("text");

                    b.Property<string>("URLTemplate")
                        .HasColumnType("text");

                    b.Property<string>("XFieldPath")
                        .HasColumnType("text");

                    b.Property<string>("YFieldPath")
                        .HasColumnType("text");

                    b.HasDiscriminator().HasValue("APISearchDefinition");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Search.DatabaseSearchDefinition", b =>
                {
                    b.HasBaseType("GIFrameworkMaps.Data.Models.Search.SearchDefinition");

                    b.Property<string>("GeomField")
                        .HasColumnType("text");

                    b.Property<string>("OrderByClause")
                        .HasColumnType("text");

                    b.Property<string>("TableName")
                        .HasColumnType("text");

                    b.Property<string>("TitleField")
                        .HasColumnType("text");

                    b.Property<string>("WhereClause")
                        .HasColumnType("text");

                    b.Property<string>("XField")
                        .HasColumnType("text");

                    b.Property<string>("YField")
                        .HasColumnType("text");

                    b.HasDiscriminator().HasValue("DatabaseSearchDefinition");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Search.LocalSearchDefinition", b =>
                {
                    b.HasBaseType("GIFrameworkMaps.Data.Models.Search.SearchDefinition");

                    b.Property<string>("LocalSearchName")
                        .HasColumnType("text");

                    b.HasDiscriminator().HasValue("LocalSearchDefinition");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Basemap", b =>
                {
                    b.HasOne("GIFrameworkMaps.Data.Models.Bound", "Bound")
                        .WithMany()
                        .HasForeignKey("BoundId");

                    b.HasOne("GIFrameworkMaps.Data.Models.LayerSource", "LayerSource")
                        .WithMany()
                        .HasForeignKey("LayerSourceId");

                    b.Navigation("Bound");

                    b.Navigation("LayerSource");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Category", b =>
                {
                    b.HasOne("GIFrameworkMaps.Data.Models.Category", "ParentCategory")
                        .WithMany()
                        .HasForeignKey("ParentCategoryId");

                    b.Navigation("ParentCategory");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.CategoryLayer", b =>
                {
                    b.HasOne("GIFrameworkMaps.Data.Models.Category", "Category")
                        .WithMany("Layers")
                        .HasForeignKey("CategoryId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("GIFrameworkMaps.Data.Models.Layer", "Layer")
                        .WithMany()
                        .HasForeignKey("LayerId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Category");

                    b.Navigation("Layer");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Layer", b =>
                {
                    b.HasOne("GIFrameworkMaps.Data.Models.Bound", "Bound")
                        .WithMany()
                        .HasForeignKey("BoundId");

                    b.HasOne("GIFrameworkMaps.Data.Models.LayerSource", "LayerSource")
                        .WithMany()
                        .HasForeignKey("LayerSourceId");

                    b.Navigation("Bound");

                    b.Navigation("LayerSource");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.LayerSource", b =>
                {
                    b.HasOne("GIFrameworkMaps.Data.Models.Attribution", "Attribution")
                        .WithMany()
                        .HasForeignKey("AttributionId");

                    b.HasOne("GIFrameworkMaps.Data.Models.LayerSourceType", "LayerSourceType")
                        .WithMany()
                        .HasForeignKey("LayerSourceTypeId");

                    b.Navigation("Attribution");

                    b.Navigation("LayerSourceType");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.LayerSourceOption", b =>
                {
                    b.HasOne("GIFrameworkMaps.Data.Models.LayerSource", null)
                        .WithMany("LayerSourceOptions")
                        .HasForeignKey("LayerSourceId");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Version", b =>
                {
                    b.HasOne("GIFrameworkMaps.Data.Models.Bound", "Bound")
                        .WithMany()
                        .HasForeignKey("BoundId");

                    b.HasOne("GIFrameworkMaps.Data.Models.Theme", "Theme")
                        .WithMany()
                        .HasForeignKey("ThemeId");

                    b.HasOne("GIFrameworkMaps.Data.Models.WelcomeMessage", "WelcomeMessage")
                        .WithMany()
                        .HasForeignKey("WelcomeMessageId");

                    b.Navigation("Bound");

                    b.Navigation("Theme");

                    b.Navigation("WelcomeMessage");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.VersionBasemap", b =>
                {
                    b.HasOne("GIFrameworkMaps.Data.Models.Basemap", "Basemap")
                        .WithMany("VersionBasemaps")
                        .HasForeignKey("BasemapId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("GIFrameworkMaps.Data.Models.Version", null)
                        .WithMany("VersionBasemaps")
                        .HasForeignKey("VersionId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Basemap");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.VersionCategory", b =>
                {
                    b.HasOne("GIFrameworkMaps.Data.Models.Category", "Category")
                        .WithMany()
                        .HasForeignKey("CategoryId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("GIFrameworkMaps.Data.Models.Version", null)
                        .WithMany("VersionCategories")
                        .HasForeignKey("VersionId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("Category");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.VersionPrintConfiguration", b =>
                {
                    b.HasOne("GIFrameworkMaps.Data.Models.Print.PrintConfiguration", "PrintConfiguration")
                        .WithMany()
                        .HasForeignKey("PrintConfigurationId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("GIFrameworkMaps.Data.Models.Version", "Version")
                        .WithMany()
                        .HasForeignKey("VersionId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("PrintConfiguration");

                    b.Navigation("Version");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.VersionSearchDefinition", b =>
                {
                    b.HasOne("GIFrameworkMaps.Data.Models.Search.SearchDefinition", "SearchDefinition")
                        .WithMany()
                        .HasForeignKey("SearchDefinitionId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("GIFrameworkMaps.Data.Models.Version", "Version")
                        .WithMany()
                        .HasForeignKey("VersionId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("SearchDefinition");

                    b.Navigation("Version");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.VersionUser", b =>
                {
                    b.HasOne("GIFrameworkMaps.Data.Identity.ApplicationUser", "User")
                        .WithMany("VersionUsers")
                        .HasForeignKey("UserId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.HasOne("GIFrameworkMaps.Data.Models.Version", "Version")
                        .WithMany("VersionUsers")
                        .HasForeignKey("VersionId")
                        .OnDelete(DeleteBehavior.Cascade)
                        .IsRequired();

                    b.Navigation("User");

                    b.Navigation("Version");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Identity.ApplicationUser", b =>
                {
                    b.Navigation("VersionUsers");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Basemap", b =>
                {
                    b.Navigation("VersionBasemaps");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Category", b =>
                {
                    b.Navigation("Layers");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.LayerSource", b =>
                {
                    b.Navigation("LayerSourceOptions");
                });

            modelBuilder.Entity("GIFrameworkMaps.Data.Models.Version", b =>
                {
                    b.Navigation("VersionBasemaps");

                    b.Navigation("VersionCategories");

                    b.Navigation("VersionUsers");
                });
#pragma warning restore 612, 618
        }
    }
}
