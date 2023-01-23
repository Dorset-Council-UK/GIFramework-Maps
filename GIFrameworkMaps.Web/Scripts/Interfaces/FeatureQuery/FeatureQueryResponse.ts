import { Feature } from "ol";
import { Geometry } from "ol/geom";
import { Layer } from "ol/layer";
import RenderFeature from "ol/render/Feature";

export class FeatureQueryResponse {
    layer: Layer<any, any>;
    features: (Feature<Geometry> | RenderFeature)[];
}