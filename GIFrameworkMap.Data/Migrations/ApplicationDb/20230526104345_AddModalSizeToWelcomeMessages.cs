using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class AddModalSizeToWelcomeMessages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ModalSize",
                schema: "giframeworkmaps",
                table: "WelcomeMessages",
                type: "text",
                nullable: true,
                defaultValue: "modal-lg");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ModalSize",
                schema: "giframeworkmaps",
                table: "WelcomeMessages");
        }
    }
}
