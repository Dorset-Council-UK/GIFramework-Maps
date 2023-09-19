/**
Defines properties used when generating a PDF
 */
export interface PDFPageSetting {
    /** The font size of the main title if the user requested it. Also the size of the Map Key title if on map*/
    titleFontSize: number;
    /** The font size of the subtitle and date. Also the size of the individual layer titles on the key*/
    subtitleFontSize: number;
    /** The font size of the attribution*/
    attributionFontSize: number;
    /** The font size of the legend title when it is rendered on a seperate page*/
    standaloneLegendTitleFontSize: number;
    /** The maximum width a title block can be on the map when in landscape mode */
    maxLandscapeTitleLength: number;
    /** The maximum width a title block can be on the map when in portrait mode */
    maxPortraitTitleLength: number;
    /** The maximum width a subtitle block can be on the map when in landscape mode */
    maxLandscapeSubtitleLength: number;
    /** The maximum width a subtitle block can be on the map when in portrait mode */
    maxPortraitSubtitleLength: number;
    /** The total width of the page */
    pageWidth: number;
    /** The total height of the page */
    pageHeight: number;
    /** The maximum width a legend can be when on the map in portrait mode */
    inlineLegendPortraitMaxWidth?: number;
    /** The maximum width a legend can be when on the map in landscape mode */
    inlineLegendLandscapeMaxWidth?: number;
    /** The wrap_limit to apply to the GetLegendGraphic request when in landscape mode (wrap_limit is non standard and may not work with all services) */
    landscapeKeyWrapLimit: number;
    /** The wrap_limit to apply to the GetLegendGraphic request when in portrait mode (wrap_limit is non standard and may not work with all services) */
    portraitKeyWrapLimit: number;
}

export type PDFPageSettings = {
    [key in "a5" | "a4" | "a3" | "a2"]: PDFPageSetting;
};