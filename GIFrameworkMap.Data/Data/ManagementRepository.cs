using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace GIFrameworkMaps.Data
{
    public class ManagementRepository : IManagementRepository
    {
        //dependancy injection
        private readonly ILogger<ManagementRepository> _logger;
        private readonly IApplicationDbContext _context;
        private readonly IMemoryCache _memoryCache;

        public ManagementRepository(ILogger<ManagementRepository> logger, IApplicationDbContext context, IMemoryCache memoryCache)
        {
            _logger = logger;
            _context = context;
            _memoryCache = memoryCache;
        }

        /// <summary>
        /// Purges the .NET memory cache
        /// </summary>
        /// <returns>True or false depending on success or not</returns>
        public bool PurgeCache()
        {
            var memoryCache = _memoryCache as MemoryCache;
            if(memoryCache != null)
            {
                memoryCache.Compact(1);
                return true;
            }
            return false;
        }
    }
}
