import { GIFWPopupAction } from "./PopupAction";

export class GIFWPopupOptions {
    content: string | Element;
    offset: [number, number];
    actions: GIFWPopupAction[];

    constructor(content: string | Element, actions?: GIFWPopupAction[], offset: [number, number] = [0,0]) {
        this.content = content;
        this.offset = offset;
        this.actions = actions;
    }
}