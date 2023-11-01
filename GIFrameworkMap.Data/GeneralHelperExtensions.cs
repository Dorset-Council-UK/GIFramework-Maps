using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data
{
    public static class GeneralHelperExtensions
    {
        /// <summary>
        /// Returns true if a (nullable) list is not null and also contains at least one element. 
        /// </summary>
        public static bool NotNullOrEmpty<T>(this IEnumerable<T>? enumerable)
        {
            return enumerable != null && enumerable.Any();
        }
    }
}
