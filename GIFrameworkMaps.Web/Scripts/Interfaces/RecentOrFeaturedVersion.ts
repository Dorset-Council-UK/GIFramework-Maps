export interface RecentOrFeaturedVersion {
  id:number,
  name: string,
  url: string,
  type: VersionListType
}

enum VersionListType {
  Recent,
  Featured,
  Favourite
}