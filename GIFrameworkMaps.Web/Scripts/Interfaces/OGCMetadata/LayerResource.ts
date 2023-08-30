import { Extent } from "ol/extent";

export interface LayerResource {
    name: string;
    title: string;
    abstract: string;
    attribution: string;
    formats: string[];
    baseUrl: string;
    projection: string;
    extent: Extent;
    queryable: boolean;
}