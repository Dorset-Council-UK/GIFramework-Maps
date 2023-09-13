export interface PDFPageSetting {
    titleFontSize: number;
    subtitleFontSize: number;
    attributionFontSize: number;
    pageWidth: number;
    inlineLegendPortraitMaxWidth?: number;
    inlineLegendLandscapeMaxWidth?: number;
    pageHeight: number;
    maxLandscapeTitleLength: number;
    maxPortraitTitleLength: number;
    maxLandscapeSubtitleLength: number;
    maxPortraitSubtitleLength: number;
    standaloneLegendTitleFontSize: number;
}

export type PDFPageSettings = {
    [key in "a5" | "a4" | "a3" | "a2"]: PDFPageSetting;
};