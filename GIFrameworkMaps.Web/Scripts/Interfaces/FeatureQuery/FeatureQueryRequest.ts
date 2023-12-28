import { Layer } from "ol/layer";
import VectorLayer from "ol/layer/Vector";
import LayerRenderer from "ol/renderer/Layer";
import { Source } from "ol/source";
import VectorSource from "ol/source/Vector";

export interface FeatureQueryRequest {
    layer: Layer<Source, LayerRenderer<VectorLayer<VectorSource>>>;
    searchUrl?: string;
    searchMethod?: string;
    wfsRequest?: Node;
}