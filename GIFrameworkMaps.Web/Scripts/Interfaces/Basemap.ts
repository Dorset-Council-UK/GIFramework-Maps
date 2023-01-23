import { Layer } from "./Layer";

export interface Basemap extends Layer {
    previewImageURL: string;
    sortOrder: number;
}