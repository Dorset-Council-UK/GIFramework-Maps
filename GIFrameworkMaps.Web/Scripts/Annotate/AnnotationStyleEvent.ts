import AnnotationStyle from "./AnnotationStyle";


export default interface AnnotationStyleEvent extends CustomEvent {
    detail: {
        style: AnnotationStyle
    }
}