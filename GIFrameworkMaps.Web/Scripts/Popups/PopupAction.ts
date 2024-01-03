export class GIFWPopupAction {
  text: string;
  callback: () => void;
  closeOverlayOnClick: boolean;
  fixed: boolean;

  constructor(
    text: string,
    callback: () => void,
    closeOverlayOnClick: boolean = true,
    fixed: boolean = true,
  ) {
    this.text = text;
    this.callback = callback;
    this.closeOverlayOnClick = closeOverlayOnClick;
    this.fixed = fixed;
  }
}
