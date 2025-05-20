export interface LegendURL {
  name: string;
  legendUrl: string;
  headers?: Headers;
}

export interface LegendURLs {
  availableLegends: LegendURL[];
  nonLegendableLayers: string[];
}
