export interface BasicServerCapabilities {
  capabilities: Capability[];
}

export interface Capability {
  url: string;
  method: string;
  type: CapabilityType;
}

export enum CapabilityType {
  WFS_GetFeature,
  DescribeFeatureType,
  WPS_Execute,
  WPS_DescribeProcess,
}
