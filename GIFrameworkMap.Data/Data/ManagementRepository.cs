﻿using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.Models.Search;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

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

        public async Task<List<Attribution>> GetAttributions()
        {
            var attributions = await _context.Attribution
                .AsNoTracking()
                .ToListAsync();

            return attributions;
        }

        public async Task<Attribution> GetAttribution(int id)
        {
            var attribution = await _context.Attribution.FirstOrDefaultAsync(a => a.Id == id);

            return attribution;
        }
        
        public async Task<List<Models.Version>> GetVersions()
        {
            var versions = await _context.Versions
                .AsNoTracking()
                .ToListAsync();

            return versions;
        }

        public async Task<Models.Version> GetVersion(int id)
        {
            var version = await _context.Versions.FirstOrDefaultAsync(a => a.Id == id);

            return version;
        }

        public async Task<List<Bound>> GetBounds()
        {
            var bounds = await _context.Bound
                .AsNoTracking()
                .ToListAsync();

            return bounds;
        }

        public async Task<Bound> GetBound(int id)
        {
            var bound = await _context.Bound.FirstOrDefaultAsync(a => a.Id == id);

            return bound;
        }

        public async Task<List<Theme>> GetThemes()
        {
            var themes = await _context.Theme
                .AsNoTracking()
                .ToListAsync();

            return themes;
        }

        public async Task<Theme> GetTheme(int id)
        {
            var theme = await _context.Theme.FirstOrDefaultAsync(a => a.Id == id);

            return theme;
        }

        public async Task<List<WelcomeMessage>> GetWelcomeMessages()
        {
            var welcomeMessages = await _context.WelcomeMessages
                .AsNoTracking()
                .ToListAsync();

            return welcomeMessages;
        }

        public async Task<WelcomeMessage> GetWelcomeMessage(int id)
        {
            var welcomeMessage = await _context.WelcomeMessages.FirstOrDefaultAsync(a => a.Id == id);

            return welcomeMessage;
        }

        public async Task<List<WebLayerServiceDefinition>> GetWebLayerServiceDefinitions()
        {
            var webLayerServiceDefinitions = await _context.WebLayerServiceDefinitions
                .AsNoTracking()
                .ToListAsync();

            return webLayerServiceDefinitions;
        }

        public async Task<WebLayerServiceDefinition> GetWebLayerServiceDefinition(int id)
        {
            var webLayerServiceDefinition = await _context.WebLayerServiceDefinitions.FirstOrDefaultAsync(a => a.Id == id);

            return webLayerServiceDefinition;
        }

        public async Task<List<SearchDefinition>> GetSearchDefinitions()
        {
            var searchDefinitions = await _context.SearchDefinitions
                .AsNoTracking()
                .ToListAsync();

            return searchDefinitions;
        }

        public async Task<SearchDefinition> GetSearchDefinition(int id)
        {
            var searchDefinition = await _context.SearchDefinitions.FirstOrDefaultAsync(a => a.Id == id);

            return searchDefinition;
        }

        public async Task<List<APISearchDefinition>> GetAPISearchDefinitions()
        {
            var APISearchDefinitions = await _context.APISearchDefinitions
                .AsNoTracking()
                .ToListAsync();

            return APISearchDefinitions;
        }

        public async Task<APISearchDefinition> GetAPISearchDefinition(int id)
        {
            var APISearchDefinition = await _context.APISearchDefinitions.FirstOrDefaultAsync(a => a.Id == id);

            return APISearchDefinition;
        }

        public async Task<List<DatabaseSearchDefinition>> GetDatabaseSearchDefinitions()
        {
            var databaseSearchDefinitions = await _context.DatabaseSearchDefinitions
                .AsNoTracking()
                .ToListAsync();

            return databaseSearchDefinitions;
        }

        public async Task<DatabaseSearchDefinition> GetDatabaseSearchDefinition(int id)
        {
            var databaseSearchDefinition = await _context.DatabaseSearchDefinitions.FirstOrDefaultAsync(a => a.Id == id);

            return databaseSearchDefinition;
        }

        public async Task<List<LocalSearchDefinition>> GetLocalSearchDefinitions()
        {
            var localSearchDefinitions = await _context.LocalSearchDefinitions
                .AsNoTracking()
                .ToListAsync();

            return localSearchDefinitions;
        }

        public async Task<LocalSearchDefinition> GetLocalSearchDefinition(int id)
        {
            var localSearchDefinition = await _context.LocalSearchDefinitions.FirstOrDefaultAsync(a => a.Id == id);

            return localSearchDefinition;
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
