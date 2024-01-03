export interface DescribeFeatureType {
  elementFormDefault: string;
  targetNamespace: string;
  targetPrefix: string;
  featureTypes: FeatureType[];
}

export interface Property {
  name: string;
  maxOccurs: number;
  minOccurs: number;
  nillable: boolean;
  type: string;
  localType: string;
}

interface FeatureType {
  typeName: string;
  properties: Property[];
}
