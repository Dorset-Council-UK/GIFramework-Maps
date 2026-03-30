using System;
using System.Globalization;
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
        /// Attempts to convert a WGS84 coordinate represented in degrees/minutes/seconds (DMS)
        /// or degrees/decimal minutes (DDM) to its Decimal equivalent.
        /// Supports various symbol formats, hemisphere prefixes/suffixes, negative signs,
        /// colon-separated, and space-separated inputs.
        /// </summary>
        /// <param name="dmsCoord">The DMS or DDM coordinate as a string</param>
        /// <returns>A decimal coordinate</returns>
        internal static decimal ConvertDMSCoordinateToDecimal(string dmsCoord)
        {
            if (string.IsNullOrWhiteSpace(dmsCoord))
            {
                throw new ArgumentOutOfRangeException(nameof(dmsCoord), "Coordinate string is empty");
            }

            string normalized = NormalizeDMSInput(dmsCoord.Trim());
            var match = SingleDMSCoordRegex().Match(normalized);

            if (!match.Success)
            {
                throw new ArgumentOutOfRangeException(nameof(dmsCoord), $"Coordinate {dmsCoord} could not be converted to Decimal degrees");
            }

            if (!decimal.TryParse(match.Groups["deg"].Value, NumberStyles.Number, CultureInfo.InvariantCulture, out decimal degrees))
            {
                throw new ArgumentOutOfRangeException(nameof(dmsCoord), $"Coordinate {dmsCoord} could not be converted to Decimal degrees");
            }

            decimal minutes = 0;
            if (match.Groups["min"].Success && !string.IsNullOrEmpty(match.Groups["min"].Value))
            {
                if(!decimal.TryParse(match.Groups["min"].Value, NumberStyles.Number, CultureInfo.InvariantCulture, out minutes))
				{
					throw new ArgumentOutOfRangeException(nameof(dmsCoord), $"Coordinate {dmsCoord} could not be converted to Decimal degrees");
				}
			}

            decimal seconds = 0;
            if (match.Groups["sec"].Success && !string.IsNullOrEmpty(match.Groups["sec"].Value))
            {
                if(!decimal.TryParse(match.Groups["sec"].Value, NumberStyles.Number, CultureInfo.InvariantCulture, out seconds))
				{
					throw new ArgumentOutOfRangeException(nameof(dmsCoord), $"Coordinate {dmsCoord} could not be converted to Decimal degrees");
				}
			}

            string hemisphere = "";
            if (match.Groups["suffix"].Success && !string.IsNullOrEmpty(match.Groups["suffix"].Value))
            {
                hemisphere = match.Groups["suffix"].Value.ToUpper();
            }
            else if (match.Groups["prefix"].Success && !string.IsNullOrEmpty(match.Groups["prefix"].Value))
            {
                hemisphere = match.Groups["prefix"].Value.ToUpper();
            }

            bool isNegative = match.Groups["neg"].Success && match.Groups["neg"].Value == "-";

            decimal result = ConvertDegreeAngleToDecimal(degrees, minutes, seconds, hemisphere);

            if (isNegative)
            {
                result = -Math.Abs(result);
            }

            return result;
        }

        /// <summary>
        /// Attempts to parse a coordinate pair string in DMS or DDM format into decimal latitude and longitude.
        /// Handles comma-separated, hemisphere-separated, and space-separated coordinate pairs.
        /// </summary>
        /// <param name="input">The coordinate pair string</param>
        /// <param name="latitude">The parsed latitude</param>
        /// <param name="longitude">The parsed longitude</param>
        /// <returns>True if parsing succeeded, false otherwise</returns>
        internal static bool TryParseDMSCoordinatePair(string input, out decimal latitude, out decimal longitude)
        {
            latitude = 0;
            longitude = 0;

            if (string.IsNullOrWhiteSpace(input))
            {
                return false;
            }

            string normalized = NormalizeDMSInput(input.Trim());

            if (!TrySplitCoordinatePair(normalized, out string latPart, out string lonPart))
            {
                return false;
            }

            try
            {
                latitude = ConvertDMSCoordinateToDecimal(latPart);
                longitude = ConvertDMSCoordinateToDecimal(lonPart);
                return true;
            }
            catch (ArgumentOutOfRangeException)
            {
                latitude = 0;
                longitude = 0;
                return false;
            }
        }

        /// <summary>
        /// Normalizes various Unicode symbol variants and separator characters in DMS input
        /// </summary>
        private static string NormalizeDMSInput(string input)
        {
            // Replace colons with spaces (e.g., 50:39:41.8 → 50 39 41.8)
            input = input.Replace(':', ' ');

            // Normalize degree-like symbols to ° (U+00B0)
            input = input.Replace('\u02DA', '\u00B0');  // RING ABOVE
            input = input.Replace('\u00BA', '\u00B0');  // MASCULINE ORDINAL INDICATOR

            // Normalize minute/prime-like symbols to ′ (U+2032)
            input = input.Replace('\u2019', '\u2032');  // RIGHT SINGLE QUOTATION MARK
            input = input.Replace('\u02B9', '\u2032');  // MODIFIER LETTER PRIME
            input = input.Replace('\'', '\u2032');      // APOSTROPHE

            // Normalize second/double-prime-like symbols to ″ (U+2033)
            input = input.Replace('\u201C', '\u2033');  // LEFT DOUBLE QUOTATION MARK
            input = input.Replace('\u201D', '\u2033');  // RIGHT DOUBLE QUOTATION MARK
            input = input.Replace('\u02BA', '\u2033');  // MODIFIER LETTER DOUBLE PRIME
            input = input.Replace('"', '\u2033');       // QUOTATION MARK

            return input;
        }

        /// <summary>
        /// Attempts to split a coordinate pair string into two individual coordinate strings
        /// </summary>
        private static bool TrySplitCoordinatePair(string input, out string part1, out string part2)
        {
            part1 = "";
            part2 = "";
            input = input.Trim();

            if (string.IsNullOrWhiteSpace(input))
            {
                return false;
            }

            // Strategy 1: Comma-separated (e.g., "50° 39′ 41.8″ N, 2° 36′ 22.0″ W")
            int commaIndex = input.IndexOf(',');
            if (commaIndex > 0 && commaIndex < input.Length - 1)
            {
                part1 = input[..commaIndex].Trim();
                part2 = input[(commaIndex + 1)..].Trim();
                if (!string.IsNullOrWhiteSpace(part1) && !string.IsNullOrWhiteSpace(part2))
                {
                    return true;
                }
            }

            // Strategy 2: Hemisphere suffix split - N/S after a digit marks end of latitude
            // Handles: "50° 39′ 41.8″ N 2° 36′ 22.0″ W", "50 39 41.8S 37 50 43"
            var hemiSuffixMatch = HemisphereSuffixSplitRegex().Match(input);
            if (hemiSuffixMatch.Success)
            {
                part1 = hemiSuffixMatch.Groups[1].Value.Trim();
                part2 = hemiSuffixMatch.Groups[2].Value.Trim();
                if (!string.IsNullOrWhiteSpace(part1) && !string.IsNullOrWhiteSpace(part2))
                {
                    return true;
                }
            }

            // Strategy 3: E/W prefix on second coordinate (e.g., "N50° 39′ 41.8″ W2° 36′ 22.0″")
            var ewPrefixMatch = EWPrefixSplitRegex().Match(input);
            if (ewPrefixMatch.Success)
            {
                part1 = ewPrefixMatch.Groups[1].Value.Trim();
                part2 = ewPrefixMatch.Groups[2].Value.Trim();
                if (!string.IsNullOrWhiteSpace(part1) && !string.IsNullOrWhiteSpace(part2))
                {
                    return true;
                }
            }

            // Strategy 4: No hemispheres - split by number group count
            // Requires at least 4 numbers (minimum 2 per coordinate: degrees + minutes)
            var numbers = NumberGroupRegex().Matches(input);
            if (numbers.Count >= 4 && numbers.Count % 2 == 0)
            {
                int halfIndex = numbers.Count / 2;
                int splitPos = numbers[halfIndex - 1].Index + numbers[halfIndex - 1].Length;
                part1 = input[..splitPos].Trim();
                part2 = input[splitPos..].Trim();
                if (!string.IsNullOrWhiteSpace(part1) && !string.IsNullOrWhiteSpace(part2))
                {
                    return true;
                }
            }

            return false;
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
		/// Attempts to convert an OSGB alphanumeric grid reference to its 12 figure equivalent
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

		[GeneratedRegex("^[THJONS][VWXYZQRSTULMNOPFGHJKABCDE] ?[0-9]{1,5} ?[0-9]{1,5}$")]
		private static partial Regex BNGRegEx();

        /// <summary>
        /// Matches a single DMS/DDM coordinate with optional hemisphere prefix/suffix and negative sign.
        /// Requires a separator (°/′ symbol or whitespace) between number groups to prevent ambiguous parsing.
        /// Pattern structure:
        ///   prefix?  neg?  degrees  (°/′/space  minutes  (′/″/space  seconds  ″?)?)?  suffix?
        /// Handles: "50° 39′ 41.8″ N", "50 39 41.8", "N50°39′41.8″", "-50 39 41.8", "50° 39.697′ N"
        /// </summary>
        [GeneratedRegex(@"^\s*(?<prefix>[NSEWnsew])?\s*(?<neg>-)?\s*(?<deg>\d+(?:\.\d+)?)(?:(?:\s*[°′]\s*|\s+)(?:(?<min>\d+(?:\.\d+)?)(?:(?:\s*[′″]\s*|\s+)(?:(?<sec>\d+(?:\.\d+)?)\s*″?\s*)?)?)?)?(?<suffix>[NSEWnsew])?\s*$")]
        private static partial Regex SingleDMSCoordRegex();

        /// <summary>
        /// Splits a coordinate pair on N/S hemisphere suffix.
        /// Matches the first coordinate ending with a digit (possibly followed by symbols) then N or S,
        /// followed by whitespace or comma, then the second coordinate.
        /// </summary>
        [GeneratedRegex(@"^(.+\d[^\dNSEWnsew]*[NSns])[\s,]+(.+)$")]
        private static partial Regex HemisphereSuffixSplitRegex();

        /// <summary>
        /// Splits a coordinate pair where the second coordinate starts with E or W.
        /// Handles hemisphere prefix formats like "N50° 39′ 41.8″ W2° 36′ 22.0″"
        /// </summary>
        [GeneratedRegex(@"^(.+?)\s+([EWew]-?\s*\d.*)$")]
        private static partial Regex EWPrefixSplitRegex();

        /// <summary>
        /// Matches individual number groups (with optional decimal parts) in a coordinate string
        /// </summary>
        [GeneratedRegex(@"\d+(?:\.\d+)?")]
        private static partial Regex NumberGroupRegex();
	}
}
