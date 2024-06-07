import { Feature } from "ol";
import { Geometry } from "ol/geom";
import { Layer } from "ol/layer";
import VectorLayer from "ol/layer/Vector";
import LayerRenderer from "ol/renderer/Layer";
import { Source } from "ol/source";

export class FeatureQueryResponse {
  layer: Layer<Source, LayerRenderer<VectorLayer<Feature<Geometry>>>>;
  features: Feature[];
}
