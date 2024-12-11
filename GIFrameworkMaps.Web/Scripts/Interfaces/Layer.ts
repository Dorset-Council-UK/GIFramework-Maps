import { Attribution } from "./Attribution";
import { Bound } from "./Bound";

export interface LayerSourceType {
  id: number;
  name: string;
  description: string;
}

export interface LayerSourceOption {
  id: number;
  name: string;
  value: string;
}

export interface LayerSource {
  id: number;
  name: string;
  description: string;
  layerSourceType: LayerSourceType;
  attribution: Attribution;
  layerSourceOptions: LayerSourceOption[];
}

export interface LayerDisclaimer {
  id: number;
  disclaimer: string;
  frequency: number;
  dismissText: string;
}
export interface Layer {
  id: string;
  name: string;
  sortOrder: number;
  isDefault: boolean;
  layerSource: LayerSource;
  layerDisclaimer: LayerDisclaimer;
  bound: Bound;
  minZoom: number;
  maxZoom: number;
  zIndex: number;
  defaultOpacity: number;
  defaultSaturation: number;
  queryable: boolean;
  infoTemplate: string;
  infoListTitleTemplate: string;
  filterable: boolean;
  defaultFilterEditable: boolean;
  removable: boolean;
  proxyMetaRequests: boolean;
  proxyMapRequests: boolean;
}
