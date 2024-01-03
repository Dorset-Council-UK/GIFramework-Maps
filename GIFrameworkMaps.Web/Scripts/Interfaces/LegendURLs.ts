interface LegendURL {
  name: string;
  legendUrl: string;
}

export interface LegendURLs {
  availableLegends: LegendURL[];
  nonLegendableLayers: string[];
}
