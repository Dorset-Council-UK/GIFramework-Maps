using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GIFrameworkMaps.Data.Migrations.ApplicationDb
{
    /// <inheritdoc />
    public partial class FixTourDetailsColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TourSteps_TourDetails_TourDetailId",
                schema: "giframeworkmaps",
                table: "TourSteps");

			//migrate column data
			migrationBuilder.Sql(
				@"
					UPDATE giframeworkmaps.""TourSteps""
					SET ""TourDetailId"" = ""TourDetailsId"";
				");

            migrationBuilder.DropColumn(
                name: "TourDetailsId",
                schema: "giframeworkmaps",
                table: "TourSteps");

            migrationBuilder.AlterColumn<int>(
                name: "TourDetailId",
                schema: "giframeworkmaps",
                table: "TourSteps",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_TourSteps_TourDetails_TourDetailId",
                schema: "giframeworkmaps",
                table: "TourSteps",
                column: "TourDetailId",
                principalSchema: "giframeworkmaps",
                principalTable: "TourDetails",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_TourSteps_TourDetails_TourDetailId",
                schema: "giframeworkmaps",
                table: "TourSteps");

            migrationBuilder.AlterColumn<int>(
                name: "TourDetailId",
                schema: "giframeworkmaps",
                table: "TourSteps",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "TourDetailsId",
                schema: "giframeworkmaps",
                table: "TourSteps",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddForeignKey(
                name: "FK_TourSteps_TourDetails_TourDetailId",
                schema: "giframeworkmaps",
                table: "TourSteps",
                column: "TourDetailId",
                principalSchema: "giframeworkmaps",
                principalTable: "TourDetails",
                principalColumn: "Id");
        }
    }
}
