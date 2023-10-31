using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;

namespace GIFrameworkMaps.Data
{
    public class PrintRepository : IPrintRepository
    {
        //dependancy injection
        private readonly IApplicationDbContext _context;
        private readonly IMemoryCache _memoryCache;

        public PrintRepository(IApplicationDbContext context, IMemoryCache memoryCache)
        {
            _context = context;
            _memoryCache = memoryCache;
        }

        public Models.VersionPrintConfiguration GetPrintConfigurationByVersion(int versionId)
        {
            if (_context.Versions.Where(v => v.Id == versionId).AsNoTrackingWithIdentityResolution().Any())
            {
                string cacheKey = "PrintConfigurationByVersion/" + versionId.ToString();

                if (_memoryCache.TryGetValue(cacheKey, out Models.VersionPrintConfiguration? cacheValue))
                {
                    //using null forgiving operator as if a value is found in the cache it must not be null
                    return cacheValue!;
                }
                else
                {
                    var printConfig = _context.VersionPrintConfiguration
                        .Where(v => v.VersionId == versionId)
                        .AsNoTrackingWithIdentityResolution()
                        .Include(v => v.PrintConfiguration)
                        .FirstOrDefault();

                    //If null get default based on general version (which should always exist)
                    printConfig ??= _context.VersionPrintConfiguration
                            .Where(v => v.Version!.Slug == "general")
                            .AsNoTrackingWithIdentityResolution()
                            .Include(v => v.PrintConfiguration)
                            .First();

                    // Cache the results so they can be used next time we call this function.
                    _memoryCache.Set(cacheKey, printConfig, TimeSpan.FromMinutes(10));
                    return printConfig;
                }
            }
            else
            {
                throw new KeyNotFoundException($"Version with ID {versionId} does not exist");
            }
            
            
        }

    }
}
