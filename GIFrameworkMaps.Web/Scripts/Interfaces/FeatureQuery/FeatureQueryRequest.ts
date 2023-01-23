import { Layer } from "ol/layer";

export interface FeatureQueryRequest {
    layer: Layer<any, any>;
    searchUrl?: string;
    searchMethod?: string;
    wfsRequest?: Node;
}