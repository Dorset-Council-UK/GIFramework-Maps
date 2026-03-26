using GIFrameworkMaps.Data;
using NUnit.Framework;
using System;

namespace GIFrameworkMaps.Tests
{
	public class CoordHelperTests
    {
        [Test]
        [TestCase(366_646, 101_677)]
        [TestCase(0, 0)]
        [TestCase(0.0001, 0.0001)]
        [TestCase(700_000, 1_300_000)]
        [TestCase(699_999.999, 1_299_999.999)]
        public void ValidateBNG12Figure_Valid(decimal x, decimal y)
        {
            Assert.That(CoordHelper.ValidateBNG12Figure(x,y), Is.True);
        }

        [Test]
        [TestCase(900_000, 1_700_000)]
        [TestCase(-0.0001,-0.0001)]
        [TestCase(366646, 123_456_789)]
        [TestCase(700_000.0001, 1_300_000.0001)]
        [TestCase(800_000, 101_677)]
        public void ValidateBNG12Figure_Invalid(decimal x, decimal y)
        {
            Assert.That(CoordHelper.ValidateBNG12Figure(x, y), Is.False);
        }

        [Test]
        [TestCase(50.6181, -2.2468)]
        [TestCase(-180, -180)]
        [TestCase(180, 180)]
        [TestCase(0,0)]
        [TestCase(-179.999, 179.999)]
        [TestCase(179.999, -179.999)]
        public void ValidateLatLon_Valid(decimal latitude, decimal longitude)
        {
            Assert.That(CoordHelper.ValidateLatLon(latitude, longitude), Is.True);
        }

        [Test]
        [TestCase(-180.0001,-2.2468)]
        [TestCase(50.6181, 180.0001)]
        [TestCase(-200.123,200.123)]
        public void ValidateLatLon_Invalid(decimal latitude, decimal longitude)
        {
            Assert.That(CoordHelper.ValidateLatLon(latitude, longitude), Is.False);
        }

        [Test]
        [TestCase(-244610.29377, 6622151.15931)]
        [TestCase(-20026376.39, -20048966.10)]
        [TestCase(20026376.39, 20048966.10)]
        [TestCase(0, 0)]
        public void ValidateSphericalMercator_Valid(decimal x, decimal y)
        {
            Assert.That(CoordHelper.ValidateSphericalMercator(x, y), Is.True);
        }

        [Test]
        [TestCase(-20026376.4000, -20048966.10001)]
        [TestCase(20026376.4000, 20048966.10001)]
        [TestCase(-20026376.4000, 20048966.10001)]
        [TestCase(20026376.4000, -20048966.10001)]
        [TestCase(20026376.4000, 6622151.15931)]
        [TestCase(-244610.29377, -20048966.10001)]
        public void ValidateSphericalMercator_Invalid(decimal x, decimal y)
        {
            Assert.That(CoordHelper.ValidateSphericalMercator(x, y), Is.False);
        }

        [Test]
        [TestCase("SY6773568359", ExpectedResult = new int[] { 367_735, 68_359 })]
        [TestCase("sy 677 683", ExpectedResult = new int[] { 367_700, 68_300 })]
		[TestCase("SU 37292   15488",ExpectedResult = new int[] { 437_292, 115_488 })]
        [TestCase("SV00", ExpectedResult = new int[] { 0, 0 })]
        [TestCase("HP9999999999", ExpectedResult = new int[] { 499_999, 1_299_999 })]
        [TestCase("TM 99 99 99 99", ExpectedResult = new int[] { 699990, 299990 })]
		[TestCase("JM999999", ExpectedResult = new int[] { 699900, 1299900 })]
		public int[] ConvertAlphaBNGTo12Figure_Valid(string gridref)
        {
            return CoordHelper.ConvertAlphaBNGTo12Figure(gridref);
        }

        [Test]
        [TestCase("badinput")]
        [TestCase("")]
        [TestCase("ZZ999999")]
		public void ConvertAlphaBNGTo12Figure_Invalid(string gridref)
        {
            Assert.Throws<ArgumentOutOfRangeException>(delegate { CoordHelper.ConvertAlphaBNGTo12Figure(gridref); });

        }

        [Test]
        [TestCase("50° 39′ 41.8″ N", ExpectedResult =50.66161)]
        [TestCase("2° 36′ 22.0″ W", ExpectedResult = -2.60611)]
        [TestCase("50°39′41.8″N", ExpectedResult = 50.66161)]
        [TestCase("50 39 41.8", ExpectedResult = 50.66161)]
        [TestCase("37 50′ 43 S", ExpectedResult = -37.84528)]
        [TestCase("144° 53 32.56767", ExpectedResult = 144.89238)]
        [TestCase("50° 39.697′ N", ExpectedResult = 50.66162)]           // DDM format
        [TestCase("50° 39.697′", ExpectedResult = 50.66162)]             // DDM without hemisphere
        [TestCase("N 50° 39′ 41.8″", ExpectedResult = 50.66161)]        // Hemisphere prefix with space
        [TestCase("N50°39′41.8″", ExpectedResult = 50.66161)]           // Hemisphere prefix without space
        [TestCase("S37° 50′ 43″", ExpectedResult = -37.84528)]          // South hemisphere prefix
        [TestCase("-50 39 41.8", ExpectedResult = -50.66161)]            // Negative sign
        [TestCase("50:39:41.8", ExpectedResult = 50.66161)]             // Colon-separated
        [TestCase("2:36:22.0 W", ExpectedResult = -2.60611)]            // Colon-separated with hemisphere
        [TestCase("50°N", ExpectedResult = 50.0)]                       // Degrees only with hemisphere
        [TestCase("50° N", ExpectedResult = 50.0)]                      // Degrees only with hemisphere and space
        [TestCase("50 39 N", ExpectedResult = 50.65)]                   // Degrees and minutes only
        [TestCase("50'39'41.8 N", ExpectedResult = 50.66161)]           // ASCII apostrophes as separators
        public decimal ConvertDMSCoordinateToDecimal_Valid(string dmsCoord)
        {
            return CoordHelper.ConvertDMSCoordinateToDecimal(dmsCoord);
        }

        [Test]
        [TestCase("100″ N")]
        [TestCase("2″ 36° 22.0′ W")]
        [TestCase("")]
        [TestCase("badinput")]
        public void ConvertDMSCoordinateToDecimal_Invalid(string dmsCoord)
        { 
            Assert.Throws<ArgumentOutOfRangeException>(delegate { CoordHelper.ConvertDMSCoordinateToDecimal(dmsCoord); });
        }

        [Test]
        [TestCase("50° 39′ 41.8″ N 2° 36′ 22.0″ W", 50.66161, -2.60611)]
        [TestCase("50°39′41.8″N 144° 53 32.56767", 50.66161, 144.89238)]
        [TestCase("50 39 41.8S 37 50 43", -50.66161, 37.84528)]
        [TestCase("50° 39′ 41.8″ N, 2° 36′ 22.0″ W", 50.66161, -2.60611)]                 // Comma-separated
        [TestCase("50°39′41.8″N,2°36′22.0″W", 50.66161, -2.60611)]                         // Comma no spaces
        [TestCase("50 39 41.8 37 50 43", 50.66161, 37.84528)]                               // No hemispheres
        [TestCase("50° 39.697′ N 2° 36.367′ W", 50.66162, -2.60612)]                        // DDM format
        [TestCase("50° 39.697′ N, 2° 36.367′ W", 50.66162, -2.60612)]                       // DDM with comma
        [TestCase("50:39:41.8N 2:36:22.0W", 50.66161, -2.60611)]                            // Colon-separated
        [TestCase("N50°39′41.8″ W2°36′22.0″", 50.66161, -2.60611)]                         // Hemisphere prefix
        [TestCase("50 39.697 2 36.367", 50.66162, 2.60612)]                                 // DDM no hemispheres
        public void TryParseDMSCoordinatePair_Valid(string input, decimal expectedLat, decimal expectedLon)
        {
            bool result = CoordHelper.TryParseDMSCoordinatePair(input, out decimal latitude, out decimal longitude);

            Assert.That(result, Is.True);
            Assert.That(latitude, Is.EqualTo(expectedLat));
            Assert.That(longitude, Is.EqualTo(expectedLon));
        }

        [Test]
        [TestCase("")]
        [TestCase("astring")]
        [TestCase("50")]
        [TestCase("just one coordinate 50 39 41.8")]
        public void TryParseDMSCoordinatePair_Invalid(string input)
        {
            bool result = CoordHelper.TryParseDMSCoordinatePair(input, out _, out _);

            Assert.That(result, Is.False);
        }
    }
}
