import { Geometry } from "ol/geom";
import AnnotationSource from "./AnnotationSource";
import { Options } from "ol/layer/BaseVector";
import VectorLayer from "ol/layer/Vector";
import { Feature } from "ol";

export default class AnnotationLayer extends VectorLayer<Feature<Geometry>> {
  constructor(options?: Options<AnnotationSource>) {
    super(options);
  }
}
