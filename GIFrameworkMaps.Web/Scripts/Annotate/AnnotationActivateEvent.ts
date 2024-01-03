import { AnnotationTool } from "./AnnotationTool";

export default interface AnnotationActivateEvent extends CustomEvent {
  detail: {
    tool: AnnotationTool;
  };
}
