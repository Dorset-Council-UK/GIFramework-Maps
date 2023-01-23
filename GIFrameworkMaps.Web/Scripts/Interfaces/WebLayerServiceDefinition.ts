export interface WebLayerServiceDefinition {
    id: number;
    name: string;
    description: string;
    url: string;
    type: ServiceType;
    version: string;
    category: string;
    sortOrder: number;
}

export enum ServiceType {
    WMS,
    WFS,
    OWS,
    WMTS
}