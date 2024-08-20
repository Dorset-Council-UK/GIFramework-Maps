import { Feature } from "ol";
import AnnotationSource from "./AnnotationSource";
import { Options } from "ol/layer/BaseVector";
import VectorLayer from "ol/layer/Vector";

export default class AnnotationLayer extends VectorLayer {
  constructor(options?: Options<Feature, AnnotationSource>) {
    super(options);
  }
}
