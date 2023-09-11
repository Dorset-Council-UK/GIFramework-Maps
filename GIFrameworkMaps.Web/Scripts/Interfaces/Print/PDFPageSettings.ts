export interface PDFPageSetting {
    titleFontSize: number;
    subtitleFontSize: number;
    attributionFontSize: number;
    pageWidth: number;
    pageHeight: number;
    maxLandscapeTitleLength: number;
    maxPortraitTitleLength: number;
    maxLandscapeSubtitleLength: number;
    maxPortraitSubtitleLength: number;
    legendTitleFontSize: number;
}

export type PDFPageSettings = {
    [key in "a5" | "a4" | "a3" | "a2"]: PDFPageSetting;
};