using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.ViewModels;
using System.Collections.Generic;
using System.Linq;

namespace GIFrameworkMaps.Data
{
	public static class ModelMapper
	{
		public static VersionViewModel ToViewModel(this Models.Version version)
		{
			return new VersionViewModel
			{
				Id = version.Id,
				Name = version.Name,
				Description = version.Description,
				Slug = version.Slug,
				HelpURL = version.HelpURL,
				FeedbackURL = version.FeedbackURL,
				VersionImageURL = version.VersionImageURL,
				ShowLogin = version.ShowLogin,
				FeaturedVersion = version.FeaturedVersion,
				Hidden = version.Hidden,
				Theme = version.Theme,
				Bound = version.Bound,
				WelcomeMessage = version.WelcomeMessage,
				TourDetails = version.TourDetails,
				Attribution = version.Attribution
			};
		}

		public static BasemapViewModel ToViewModel(this VersionBasemap versionBasemap)
		{
			return new BasemapViewModel
			{
				Id = versionBasemap.Basemap!.Id,
				Name = versionBasemap.Basemap!.Name,
				IsDefault = versionBasemap.IsDefault,
				PreviewImageURL = versionBasemap.Basemap!.PreviewImageURL,
				Bound = versionBasemap.Basemap!.Bound,
				MaxZoom = versionBasemap.Basemap!.MaxZoom,
				MinZoom = versionBasemap.Basemap!.MinZoom,
				DefaultOpacity = versionBasemap.DefaultOpacity,
				DefaultSaturation = versionBasemap.DefaultSaturation,
				SortOrder = versionBasemap.SortOrder,
				LayerSource = versionBasemap.Basemap!.LayerSource
			};
		}

		public static CategoryViewModel ToViewModel(this VersionCategory versionCategory)
		{
			return new CategoryViewModel
			{
				Id = versionCategory.Category!.Id,
				Name = versionCategory.Category!.Name,
				Order = versionCategory.Category!.Order,
				Layers = versionCategory.Category!.Layers.Select(cl => cl.ToViewModel()).ToList(),
				ParentCategory = versionCategory.Category!.ParentCategory != null 
					? new CategoryViewModel
					{
						Id = versionCategory.Category!.ParentCategory.Id,
						Name = versionCategory.Category!.ParentCategory.Name,
						Order = versionCategory.Category!.ParentCategory.Order,
						Layers = new List<LayerViewModel>(),
						ParentCategory = null
					}
					: null
			};
		}

		public static LayerViewModel ToViewModel(this CategoryLayer categoryLayer)
		{
			return new LayerViewModel
			{
				Id = categoryLayer.LayerId,
				LayerSource = categoryLayer.Layer!.LayerSource,
				LayerDisclaimer = categoryLayer.Layer!.LayerDisclaimer,
				Name = categoryLayer.Layer!.Name,
				ZIndex = categoryLayer.Layer!.ZIndex,
				SortOrder = categoryLayer.SortOrder,
				MinZoom = categoryLayer.Layer!.MinZoom,
				MaxZoom = categoryLayer.Layer!.MaxZoom,
				Bound = categoryLayer.Layer!.Bound,
				DefaultOpacity = categoryLayer.Layer!.DefaultOpacity,
				DefaultSaturation = categoryLayer.Layer!.DefaultSaturation,
				Queryable = categoryLayer.Layer!.Queryable,
				Filterable = categoryLayer.Layer!.Filterable,
				DefaultFilterEditable = categoryLayer.Layer!.DefaultFilterEditable,
				ProxyMapRequests = categoryLayer.Layer!.ProxyMapRequests,
				ProxyMetaRequests = categoryLayer.Layer!.ProxyMetaRequests,
				RefreshInterval = categoryLayer.Layer!.RefreshInterval
			};
		}

		public static ProjectionViewModel ToViewModel(this VersionProjection versionProjection)
		{
			return new ProjectionViewModel
			{
				EPSGCode = versionProjection.Projection!.EPSGCode,
				Name = versionProjection.Projection!.Name,
				Description = versionProjection.Projection!.Description,
				Proj4Definition = versionProjection.Projection!.Proj4Definition,
				DefaultRenderedDecimalPlaces = versionProjection.Projection!.DefaultRenderedDecimalPlaces,
				MinBoundX = versionProjection.Projection!.MinBoundX,
				MinBoundY = versionProjection.Projection!.MinBoundY,
				MaxBoundX = versionProjection.Projection!.MaxBoundX,
				MaxBoundY = versionProjection.Projection!.MaxBoundY,
				IsDefaultViewProjection = versionProjection.IsDefaultViewProjection,
				IsDefaultMapProjection = versionProjection.IsDefaultMapProjection
			};
		}

		public static List<BasemapViewModel> ToViewModelList(this IEnumerable<VersionBasemap> versionBasemaps)
		{
			return versionBasemaps.Select(vb => vb.ToViewModel()).ToList();
		}

		public static List<CategoryViewModel> ToViewModelList(this IEnumerable<VersionCategory> versionCategories)
		{
			return versionCategories.Select(vc => vc.ToViewModel()).ToList();
		}

		public static List<ProjectionViewModel> ToViewModelList(this IEnumerable<VersionProjection> versionProjections)
		{
			return versionProjections.Select(vp => vp.ToViewModel()).ToList();
		}
	}
}
