using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
[assembly: InternalsVisibleTo("GIFrameworkMaps.Tests")]
namespace GIFrameworkMaps.Data
{
	public partial class CoordHelper
    {
        /// <summary>
        /// Checks whether a BNG 12 figure grid ref pair is within the UK
        /// </summary>
        /// <param name="x"></param>
        /// <param name="y"></param>
        /// <returns>True if valid. False otherwise.</returns>
        internal static bool ValidateBNG12Figure(decimal x, decimal y)
        {
            if(x >= 0 && x <= 700000 && y >= 0 && y<=1300000) {
                return true;
            }
            return false;
        }

        /// <summary>
        /// Checks whether a lat/lon pair is a location on Earth
        /// </summary>
        /// <param name="latitude"></param>
        /// <param name="longitude"></param>
        /// <returns>True if valid. False otherwise.</returns>
        internal static bool ValidateLatLon(decimal latitude, decimal longitude)
        {
            if(latitude >= -180 && latitude <= 180 && longitude >= -180 && longitude <= 180)
            {
                return true;
            }
            return false;
        }

        internal static bool ValidateSphericalMercator(decimal x, decimal y)
        {
            
            if(x >= -20026376.39M && x <= 20026376.39M && y >= -20048966.10M && y<= 20048966.10M)
            {
                return true;
            }
            return false;
        }

		internal static bool ValidateBNGGridReference(string gridref)
		{
			Regex pattern = BNGRegEx();
			return pattern.IsMatch(gridref.ToUpper());
		}

        /// <summary>
        /// Attempts to convert a WGS84 coordinate represented in degrees minutes and seconds to its Decimal equivilant
        /// </summary>
        /// <param name="dmsCoord">The DMS coordinate as a string</param>
        /// <returns>A decimal coordinate</returns>
        internal static decimal ConvertDMSCoordinateToDecimal(string dmsCoord)
        {

            dmsCoord = dmsCoord.Trim();
            /*parse the three parts of the coordinate out of the string*/
            /*the first part will be the numbers until either the degree symbol is hit or a space*/
            /*the second part will be the numbers until either an apostrophe symbol is hit or a space*/
            /*the third part will be the numbers until the last number in the string*/
            /*This could perhaps be better done with regular expressions*/
            var firstBreak = dmsCoord.IndexOfAny([' ', '°']);
            var degrees = dmsCoord[..firstBreak];

            var startPointOfSecondSection = dmsCoord.IndexOfAny("0123456789".ToCharArray(),firstBreak);
            var secondBreak = dmsCoord.IndexOfAny([' ', '\'', '′'],startPointOfSecondSection);
            var minutes = dmsCoord[startPointOfSecondSection..secondBreak];

            var startPointOfThirdSection = dmsCoord.IndexOfAny("0123456789".ToCharArray(), secondBreak);
            var thirdBreak = dmsCoord.LastIndexOfAny("0123456789".ToCharArray())+1;
            var seconds = dmsCoord[startPointOfThirdSection..thirdBreak];

            Regex pattern = NSEWRegex();
            var hemisphereIndicator = pattern.Match(dmsCoord.ToUpper());
            if (decimal.TryParse(degrees, out decimal d) && decimal.TryParse(minutes, out decimal m) && decimal.TryParse(seconds, out decimal s))
            {
                return ConvertDegreeAngleToDecimal(d, m, s, hemisphereIndicator.Success ? hemisphereIndicator.Value : "");
            }
            throw new ArgumentOutOfRangeException(nameof(dmsCoord),$"Coordinate {dmsCoord} could not be converted to Decimal degrees");
        }

        /// <summary>
        /// Converts a single DMS coordinate into a single Decimal coordinate
        /// </summary>
        /// <param name="degrees">The 'degrees' part of the DMS coordinate</param>
        /// <param name="minutes">The 'minutes' part of the DMS coordinate</param>
        /// <param name="seconds">The 'seconds' part of the DMS coordinate</param>
        /// <param name="hemisphere">The hemisphere character (N/S/E/W)</param>
        /// <returns>A decimal coordinate</returns>
        /// <remarks>Adapted from https://stackoverflow.com/a/28640937/863487 by Matt Cashatt CC BY-SA 3.0</remarks>
        internal static decimal ConvertDegreeAngleToDecimal(decimal degrees, decimal minutes, decimal seconds, string hemisphere = "")
        {

            var multiplier = hemisphere.Contains('S') || hemisphere.Contains('W') ? -1 : 1; //handle south and west

            //Decimal degrees = 
            //   whole number of degrees, 
            //   plus minutes divided by 60, 
            //   plus seconds divided by 3600

            minutes /= 60;
            seconds /= 3600;

            return decimal.Round((degrees + minutes + seconds) * multiplier,5);
        }

		/// <summary>
		/// Attempts to convert an OSGB alphanumeric grid reference to its 12 figure equivilant
		/// </summary>
		/// <param name="gridRef">The full grid reference (e.g ST6664601667)</param>
		/// <returns>An array of 2 integers representing the X and Y portions of the converted grid reference</returns>
		/// <remarks>Adapted from OS Transform from Ordnance Survey (OGL v3) https://github.com/OrdnanceSurvey/os-transform/</remarks>
		public static int[] ConvertAlphaBNGTo12Figure(string gridref)
		{
			gridref = gridref.ToUpper().Trim().Replace(" ","");
			if (!ValidateBNGGridReference(gridref))
			{
				throw new ArgumentOutOfRangeException(nameof(gridref), "Grid reference not recognised");
			}
			string gridLetters = "VWXYZQRSTULMNOPFGHJKABCDE";

			string refGrid = gridref.ToUpper().Replace(" ", "");

			int majorEasting = gridLetters.IndexOf(refGrid[0]) % 5 * 500000 - 1000000;
			int majorNorthing = (int)(Math.Floor((decimal)gridLetters.IndexOf(refGrid[0]) / 5) * 500000 - 500000);

			int minorEasting = gridLetters.IndexOf(refGrid[1]) % 5 * 100000;
			int minorNorthing = (int)(Math.Floor((decimal)gridLetters.IndexOf(refGrid[1]) / 5) * 100000);

			int i = (refGrid.Length - 2) / 2;
			double m = Math.Pow(10, 5 - i);

			int e = majorEasting + minorEasting + (int.Parse(refGrid.Substring(2, i)) * (int)m);
			int n = majorNorthing + minorNorthing + (int.Parse(refGrid.Substring(i + 2, i)) * (int)m);

			return [e, n];
		}

        [GeneratedRegex("[NSEW]")]
        private static partial Regex NSEWRegex();

		[GeneratedRegex("^[THJONS][VWXYZQRSTULMNOPFGHJKABCDE] ?[0-9]{1,5} ?[0-9]{1,5}$")]
		private static partial Regex BNGRegEx();
	}
}
