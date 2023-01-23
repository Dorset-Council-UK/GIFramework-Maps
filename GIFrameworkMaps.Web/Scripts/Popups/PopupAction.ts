export class GIFWPopupAction {
    text: string;
    callback: () => void;
    closeOverlayOnClick: Boolean;
    fixed: Boolean;

    constructor(text: string, callback: () => void, closeOverlayOnClick: Boolean = true, fixed: Boolean = true) {
        this.text = text;
        this.callback = callback;
        this.closeOverlayOnClick = closeOverlayOnClick;
        this.fixed = fixed;
    }
}