import * as olExtent from 'ol/extent';

export interface SearchResult {
    displayText: string;
    x?: number;
    y?: number;
    zoom?: number;
    bbox?: olExtent.Extent;
    ordering: number;
    epsg: number;
    geom?: string
}

export interface SearchResultCategory {
    results: Array<SearchResult>;
    categoryName: string;
    ordering: number;
    attributionHtml: string;
    supressGeom: boolean;
}

export interface SearchResults {
    resultCategories: Array<SearchResultCategory>;
    totalResults: number;
    isError: boolean;
}