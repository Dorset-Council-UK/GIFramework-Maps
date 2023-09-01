import { Extent } from "ol/extent";

export interface LayerResource {
    name: string;
    title: string;
    abstract: string;
    attribution: string;
    formats: string[];
    baseUrl: string;
    projections: string[];
    extent: Extent;
    queryable: boolean;
    version: string;
    proxyMetaRequests: boolean;
    proxyMapRequests: boolean;
}