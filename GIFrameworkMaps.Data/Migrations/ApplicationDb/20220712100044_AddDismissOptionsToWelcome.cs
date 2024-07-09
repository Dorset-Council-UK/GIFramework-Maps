using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    public partial class AddDismissOptionsToWelcome : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "DismissOnButtonOnly",
                schema: "giframeworkmaps",
                table: "WelcomeMessages",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "DismissText",
                schema: "giframeworkmaps",
                table: "WelcomeMessages",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DismissOnButtonOnly",
                schema: "giframeworkmaps",
                table: "WelcomeMessages");

            migrationBuilder.DropColumn(
                name: "DismissText",
                schema: "giframeworkmaps",
                table: "WelcomeMessages");
        }
    }
}
