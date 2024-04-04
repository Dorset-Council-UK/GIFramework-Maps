export interface RecentOrFeaturedVersion {
  id:number,
  name: string,
  url: string,
  type: VersionListType
}

export enum VersionListType {
  Recent = "Recent",
  Featured = "Featured",
  Favourite = "Favourite"
}