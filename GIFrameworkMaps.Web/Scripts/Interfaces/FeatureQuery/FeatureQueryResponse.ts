import { Feature } from "ol";
import { Geometry } from "ol/geom";
import { Layer } from "ol/layer";
import VectorLayer from "ol/layer/Vector";
import RenderFeature from "ol/render/Feature";
import LayerRenderer from "ol/renderer/Layer";
import { Source } from "ol/source";
import VectorSource from "ol/source/Vector";

export class FeatureQueryResponse {
    layer: Layer<Source, LayerRenderer<VectorLayer<VectorSource>>>;
    features: (Feature<Geometry> | RenderFeature)[];
}