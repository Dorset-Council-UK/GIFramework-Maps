import AnnotationSource from "./AnnotationSource";

import { Options } from "ol/layer/BaseVector";
import VectorLayer from "ol/layer/Vector";

export default class AnnotationLayer extends VectorLayer<AnnotationSource> {
  constructor(options?: Options<AnnotationSource>) {
    super(options);
  }
}
