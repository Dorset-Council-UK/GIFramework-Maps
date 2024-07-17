export interface WebLayerServiceDefinition {
  id: number;
  name: string;
  description: string;
  url: string;
  type: ServiceType;
  version: string;
  category: string;
  sortOrder: number;
  proxyMetaRequests: boolean;
  proxyMapRequests: boolean;
}

export enum ServiceType {
  WMS,
  WFS,
  OWS,
  WMTS,
  WPS
}
