using System;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.RegularExpressions;
[assembly: InternalsVisibleTo("GIFrameworkMaps.Tests")]
namespace GIFrameworkMaps.Data
{
    public class CoordHelper
    {
        /// <summary>
        /// Checks whether a BNG 12 figure grid ref pair is within the UK
        /// </summary>
        /// <param name="x"></param>
        /// <param name="y"></param>
        /// <returns>True if valid. False otherwise.</returns>
        internal static bool ValidateBNG12Figure(decimal x, decimal y)
        {
            if((x >= 0 && x <= 700000) && (y >= 0 && y<=1300000)) {
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
            if((latitude >= -180 && latitude <= 180) && (longitude >= -180 && longitude <= 180))
            {
                return true;
            }
            return false;
        }

        internal static bool ValidateSphericalMercator(decimal x, decimal y)
        {
            
            if((x >= -20026376.39M && x <= 20026376.39M) && (y >= -20048966.10M && y<= 20048966.10M))
            {
                return true;
            }
            return false;
        }

        /// <summary>
        /// Attempts to convert an OSGB alphanumeric grid reference to its 12 figure equivilant
        /// </summary>
        /// <param name="gridRef">The full grid reference (e.g ST6664601667)</param>
        /// <returns>An array of 2 integers representing the X and Y portions of the converted grid reference</returns>
        public static int[] ConvertAlphaBNGTo12Figure(string gridRef)
        {
            string x, y;
            gridRef = gridRef.Replace(" ", "");
            var alpha = gridRef.Substring(0, 2);
            var xy = TranslateOSGBAlphaCharactersToNumerics(alpha.ToUpper());
            if(xy != null)
            {
                x = xy[0].ToString();
                y = xy[1].ToString();
                gridRef = gridRef.Substring(2);
                x += gridRef.Substring(0, gridRef.Length / 2);
                y += gridRef.Substring(gridRef.Length / 2);
                for(int i = x.Length; i < 6; i++)
                {
                    x += "0";
                    y += "0";
                }
                int[] returnCoords = new int[2];
                returnCoords[0] = int.Parse(x);
                returnCoords[1] = int.Parse(y);
                return returnCoords;
            }
            throw new ArgumentOutOfRangeException(nameof(gridRef), "Grid reference not recognised");
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
            var firstBreak = dmsCoord.IndexOfAny(new char[] { ' ', '°' });
            var degrees = dmsCoord.Substring(0, firstBreak);

            var startPointOfSecondSection = dmsCoord.IndexOfAny("0123456789".ToCharArray(),firstBreak);
            var secondBreak = dmsCoord.IndexOfAny(new char[] { ' ', '\'', '′' },startPointOfSecondSection);
            var minutes = dmsCoord.Substring(startPointOfSecondSection, (secondBreak - startPointOfSecondSection));

            var startPointOfThirdSection = dmsCoord.IndexOfAny("0123456789".ToCharArray(), secondBreak);
            var thirdBreak = dmsCoord.LastIndexOfAny("0123456789".ToCharArray())+1;
            var seconds = dmsCoord.Substring(startPointOfThirdSection, (thirdBreak - startPointOfThirdSection));

            Regex pattern = new Regex("[NSEW]");
            var hemisphereIndicator = pattern.Match(dmsCoord.ToUpper());
            decimal d, m, s;
            if(decimal.TryParse(degrees,out d) && decimal.TryParse(minutes,out m) && decimal.TryParse(seconds, out s))
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

            var multiplier = (hemisphere.Contains('S') || hemisphere.Contains('W')) ? -1 : 1; //handle south and west

            //Decimal degrees = 
            //   whole number of degrees, 
            //   plus minutes divided by 60, 
            //   plus seconds divided by 3600

            minutes /= 60;
            seconds /= 3600;

            return Decimal.Round((degrees + minutes + seconds) * multiplier,5);
        }

        /// <summary>
        /// Translates the Alpha part of an OSGB grid reference to their equivilant numerics
        /// </summary>
        /// <param name="alpha">The alpha characters e.g. ST (upper case)</param>
        /// <returns>An array of 2 integers representing the X and Y numeric</returns>
        public static int[]? TranslateOSGBAlphaCharactersToNumerics(string alpha)
        {
            int[] return_array = new int[2];
            switch (alpha)
            {
                case "SV":
                    {
                        return_array[0] = 0;
                        return_array[1] = 0;
                        break;
                    }

                case "SW":
                    {
                        return_array[0] = 1;
                        return_array[1] = 0;
                        break;
                    }

                case "SX":
                    {
                        return_array[0] = 2;
                        return_array[1] = 0;
                        break;
                    }

                case "SY":
                    {
                        return_array[0] = 3;
                        return_array[1] = 0;
                        break;
                    }

                case "SZ":
                    {
                        return_array[0] = 4;
                        return_array[1] = 0;
                        break;
                    }

                case "TV":
                    {
                        return_array[0] = 5;
                        return_array[1] = 0;
                        break;
                    }

                case "SR":
                    {
                        return_array[0] = 1;
                        return_array[1] = 1;
                        break;
                    }

                case "SS":
                    {
                        return_array[0] = 2;
                        return_array[1] = 1;
                        break;
                    }

                case "ST":
                    {
                        return_array[0] = 3;
                        return_array[1] = 1;
                        break;
                    }

                case "SU":
                    {
                        return_array[0] = 4;
                        return_array[1] = 1;
                        break;
                    }

                case "TQ":
                    {
                        return_array[0] = 5;
                        return_array[1] = 1;
                        break;
                    }

                case "TR":
                    {
                        return_array[0] = 6;
                        return_array[1] = 1;
                        break;
                    }

                case "SM":
                    {
                        return_array[0] = 1;
                        return_array[1] = 2;
                        break;
                    }

                case "SN":
                    {
                        return_array[0] = 2;
                        return_array[1] = 2;
                        break;
                    }

                case "SO":
                    {
                        return_array[0] = 3;
                        return_array[1] = 2;
                        break;
                    }

                case "SP":
                    {
                        return_array[0] = 4;
                        return_array[1] = 2;
                        break;
                    }

                case "TL":
                    {
                        return_array[0] = 5;
                        return_array[1] = 2;
                        break;
                    }

                case "TM":
                    {
                        return_array[0] = 6;
                        return_array[1] = 2;
                        break;
                    }

                case "SH":
                    {
                        return_array[0] = 2;
                        return_array[1] = 3;
                        break;
                    }

                case "SJ":
                    {
                        return_array[0] = 3;
                        return_array[1] = 3;
                        break;
                    }

                case "SK":
                    {
                        return_array[0] = 4;
                        return_array[1] = 3;
                        break;
                    }

                case "TF":
                    {
                        return_array[0] = 5;
                        return_array[1] = 3;
                        break;
                    }

                case "TG":
                    {
                        return_array[0] = 6;
                        return_array[1] = 3;
                        break;
                    }

                case "SC":
                    {
                        return_array[0] = 2;
                        return_array[1] = 4;
                        break;
                    }

                case "SD":
                    {
                        return_array[0] = 3;
                        return_array[1] = 4;
                        break;
                    }

                case "SE":
                    {
                        return_array[0] = 4;
                        return_array[1] = 4;
                        break;
                    }

                case "TA":
                    {
                        return_array[0] = 5;
                        return_array[1] = 4;
                        break;
                    }

                case "NW":
                    {
                        return_array[0] = 1;
                        return_array[1] = 5;
                        break;
                    }

                case "NX":
                    {
                        return_array[0] = 2;
                        return_array[1] = 5;
                        break;
                    }

                case "NY":
                    {
                        return_array[0] = 3;
                        return_array[1] = 5;
                        break;
                    }

                case "NZ":
                    {
                        return_array[0] = 4;
                        return_array[1] = 5;
                        break;
                    }

                case "NR":
                    {
                        return_array[0] = 1;
                        return_array[1] = 6;
                        break;
                    }

                case "NS":
                    {
                        return_array[0] = 2;
                        return_array[1] = 6;
                        break;
                    }

                case "NT":
                    {
                        return_array[0] = 3;
                        return_array[1] = 6;
                        break;
                    }

                case "NU":
                    {
                        return_array[0] = 4;
                        return_array[1] = 6;
                        break;
                    }

                case "NL":
                    {
                        return_array[0] = 0;
                        return_array[1] = 7;
                        break;
                    }

                case "NM":
                    {
                        return_array[0] = 1;
                        return_array[1] = 7;
                        break;
                    }

                case "NN":
                    {
                        return_array[0] = 2;
                        return_array[1] = 7;
                        break;
                    }

                case "NO":
                    {
                        return_array[0] = 3;
                        return_array[1] = 7;
                        break;
                    }

                case "NF":
                    {
                        return_array[0] = 0;
                        return_array[1] = 8;
                        break;
                    }

                case "NG":
                    {
                        return_array[0] = 1;
                        return_array[1] = 8;
                        break;
                    }

                case "NH":
                    {
                        return_array[0] = 2;
                        return_array[1] = 8;
                        break;
                    }

                case "NJ":
                    {
                        return_array[0] = 3;
                        return_array[1] = 8;
                        break;
                    }

                case "NK":
                    {
                        return_array[0] = 4;
                        return_array[1] = 8;
                        break;
                    }

                case "NA":
                    {
                        return_array[0] = 0;
                        return_array[1] = 9;
                        break;
                    }

                case "NB":
                    {
                        return_array[0] = 1;
                        return_array[1] = 9;
                        break;
                    }

                case "NC":
                    {
                        return_array[0] = 2;
                        return_array[1] = 9;
                        break;
                    }

                case "ND":
                    {
                        return_array[0] = 3;
                        return_array[1] = 9;
                        break;
                    }

                case "HP":
                    {
                        return_array[0] = 4;
                        return_array[1] = 12;
                        break;
                    }

                case "HT":
                    {
                        return_array[0] = 3;
                        return_array[1] = 11;
                        break;
                    }

                case "HU":
                    {
                        return_array[0] = 4;
                        return_array[1] = 11;
                        break;
                    }

                case "HY":
                    {
                        return_array[0] = 3;
                        return_array[1] = 10;
                        break;
                    }

                case "HZ":
                    {
                        return_array[0] = 4;
                        return_array[1] = 10;
                        break;
                    }

                default:
                    {
                        return null;
                    }
            }

            return return_array;
        }


    }
}
