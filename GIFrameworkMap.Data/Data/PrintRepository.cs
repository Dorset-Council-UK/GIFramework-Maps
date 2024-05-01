using GIFrameworkMaps.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GIFrameworkMaps.Data
{
	public class PrintRepository(IApplicationDbContext context, IMemoryCache memoryCache) : IPrintRepository
    {
		public async Task<VersionPrintConfiguration> GetPrintConfigurationByVersion(int versionId)
        {
			// Check if the version exists
			bool versionExists = await context.Versions
				.AsNoTracking()
				.IgnoreAutoIncludes()
				.AnyAsync(v => v.Id == versionId);

			if (!versionExists)
			{
				throw new KeyNotFoundException($"Version with ID {versionId} does not exist");
			}

			string cacheKey = "PrintConfigurationByVersion/" + versionId.ToString();

			if (memoryCache.TryGetValue(cacheKey, out Models.VersionPrintConfiguration? cacheValue))
			{
				//using null forgiving operator as if a value is found in the cache it must not be null
				return cacheValue!;
			}

			var printConfig = await context.VersionPrintConfigurations
                .AsNoTracking()
                .Include(o => o.PrintConfiguration)
                .FirstOrDefaultAsync(o => o.VersionId == versionId);

			// If no print config, get default based on general version (which should always exist)
			printConfig ??= await context.VersionPrintConfigurations
				.AsNoTracking()
				.Where(o => o.Version!.Slug == "general")
				.Include(o => o.PrintConfiguration)
				.FirstAsync();

            // Cache the results so they can be used next time we call this function.
            memoryCache.Set(cacheKey, printConfig, TimeSpan.FromMinutes(10));

            return printConfig;
        }
    }
}
