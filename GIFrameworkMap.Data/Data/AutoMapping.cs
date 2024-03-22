using AutoMapper;
using GIFrameworkMaps.Data.Models;
using GIFrameworkMaps.Data.ViewModels;

namespace GIFrameworkMaps.Data
{
	public class AutoMapping : Profile
	{
		public AutoMapping()
		{
			CreateMap<Version, VersionViewModel>();
			CreateMap<Layer, LayerViewModel>();
			CreateMap<Category, CategoryViewModel>();

			/*TODO - Not sure if all these 'ForMember' calls are great*/
			CreateMap<VersionBasemap, BasemapViewModel>()
				.ForMember(vb => vb.LayerSource, bvm => bvm.MapFrom(s => s.Basemap!.LayerSource))
				.ForMember(vb => vb.Id, bvm => bvm.MapFrom(s => s.Basemap!.Id))
				.ForMember(vb => vb.Name, bvm => bvm.MapFrom(s => s.Basemap!.Name))
				.ForMember(vb => vb.PreviewImageURL, bvm => bvm.MapFrom(s => s.Basemap!.PreviewImageURL))
				.ForMember(vb => vb.Bound, bvm => bvm.MapFrom(s => s.Basemap!.Bound))
				.ForMember(vb => vb.MaxZoom, bvm => bvm.MapFrom(s => s.Basemap!.MaxZoom))
				.ForMember(vb => vb.MinZoom, bvm => bvm.MapFrom(s => s.Basemap!.MinZoom));

			CreateMap<VersionCategory, CategoryViewModel>()
				.ForMember(vc => vc.Id, cvm => cvm.MapFrom(s => s.Category!.Id))
				.ForMember(vc => vc.Name, cvm => cvm.MapFrom(s => s.Category!.Name))
				.ForMember(vc => vc.Description, cvm => cvm.MapFrom(s => s.Category!.Description))
				.ForMember(vc => vc.Order, cvm => cvm.MapFrom(s => s.Category!.Order))
				.ForMember(vc => vc.Layers, cvm => cvm.MapFrom(s => s.Category!.Layers))
				.ForMember(vc => vc.ParentCategory, cvm => cvm.MapFrom(s => s.Category!.ParentCategory));

			CreateMap<CategoryLayer, LayerViewModel>()
				.ForMember(cl => cl.Id, lvm => lvm.MapFrom(s => s.LayerId))
				.ForMember(cl => cl.LayerSource, lvm => lvm.MapFrom(s => s.Layer!.LayerSource))
				.ForMember(cl => cl.Name, lvm => lvm.MapFrom(s => s.Layer!.Name))
				.ForMember(cl => cl.ZIndex, lvm => lvm.MapFrom(s => s.Layer!.ZIndex))
				.ForMember(cl => cl.SortOrder, lvm => lvm.MapFrom(s => s.SortOrder))
				.ForMember(cl => cl.MinZoom, lvm => lvm.MapFrom(s => s.Layer!.MinZoom))
				.ForMember(cl => cl.MaxZoom, lvm => lvm.MapFrom(s => s.Layer!.MaxZoom))
				.ForMember(cl => cl.Bound, lvm => lvm.MapFrom(s => s.Layer!.Bound))
				.ForMember(cl => cl.DefaultOpacity, lvm => lvm.MapFrom(s => s.Layer!.DefaultOpacity))
				.ForMember(cl => cl.DefaultSaturation, lvm => lvm.MapFrom(s => s.Layer!.DefaultSaturation))
				.ForMember(cl => cl.Queryable, lvm => lvm.MapFrom(s => s.Layer!.Queryable))
				.ForMember(cl => cl.InfoTemplate, lvm => lvm.MapFrom(s => s.Layer!.InfoTemplate))
				.ForMember(cl => cl.Filterable, lvm => lvm.MapFrom(s => s.Layer!.Filterable))
				.ForMember(cl => cl.DefaultFilterEditable, lvm => lvm.MapFrom(s => s.Layer!.DefaultFilterEditable))
				.ForMember(cl => cl.InfoListTitleTemplate, lvm => lvm.MapFrom(s => s.Layer!.InfoListTitleTemplate))
				.ForMember(cl => cl.ProxyMapRequests, lvm => lvm.MapFrom(s => s.Layer!.ProxyMapRequests))
				.ForMember(cl => cl.ProxyMetaRequests, lvm => lvm.MapFrom(s => s.Layer!.ProxyMetaRequests));

			CreateMap<VersionProjection, ProjectionViewModel>()
				.ForMember(vp => vp.EPSGCode, pvm => pvm.MapFrom(s => s.Projection!.EPSGCode))
				.ForMember(vp => vp.Name, pvm => pvm.MapFrom(s => s.Projection!.Name))
				.ForMember(vp => vp.Description, pvm => pvm.MapFrom(s => s.Projection!.Description))
				.ForMember(vp => vp.Proj4Definition, pvm => pvm.MapFrom(s => s.Projection!.Proj4Definition))
				.ForMember(vp => vp.DefaultRenderedDecimalPlaces, pvm => pvm.MapFrom(s => s.Projection!.DefaultRenderedDecimalPlaces))
				.ForMember(vp => vp.MinBoundX, pvm => pvm.MapFrom(s => s.Projection!.MinBoundX))
				.ForMember(vp => vp.MinBoundY, pvm => pvm.MapFrom(s => s.Projection!.MinBoundY))
				.ForMember(vp => vp.MaxBoundX, pvm => pvm.MapFrom(s => s.Projection!.MaxBoundX))
				.ForMember(vp => vp.MaxBoundY, pvm => pvm.MapFrom(s => s.Projection!.MaxBoundY))
				.ForMember(vp => vp.IsDefaultViewProjection, pvm => pvm.MapFrom(s => s.IsDefaultViewProjection))
				.ForMember(vp => vp.IsDefaultMapProjection, pvm => pvm.MapFrom(s => s.IsDefaultMapProjection));

		}
	}
}