import { Modal } from "bootstrap";
import { DateTime } from "luxon";
import { WelcomeMessage } from "./Interfaces/WelcomeMessage";
import { Util } from "./Util";

export class Welcome {
    config: WelcomeMessage;
    _localStorageKey: string;
    constructor(config: WelcomeMessage, versionId:number) {
        this.config = config;
        //fix up the date
        if (this.config.updateDate !== null) {
            this.config.updateDate = new Date(this.config.updateDate);
        }
        //generate the local storage access key
        this._localStorageKey = `WelcomeLastViewed-${versionId}`
    }

    /**
     * Shows the welcome message depending on the welcome message configuration
     * @returns {boolean} Boolean indicating whether the welcome message was shown to the user
     * */
    public showWelcomeMessageIfAppropriate(): boolean {
        let modal = document.querySelector('#welcome-modal')
        if (modal && this.showWelcome()) {
            Modal.getOrCreateInstance(modal).show();
            this.setLastViewedTime();
            return true;
        }
        return false;
        
    }

    private showWelcome(): boolean {
        switch (this.config.frequency) {
            case -1:
                //once
                return this.config.updateDate > this.getLastViewedTime();
            case 0:
                //always
                return true;
            default:
                //specified days
                let comparisonDate = DateTime.now().minus({ days: this.config.frequency }).toJSDate();
                return this.getLastViewedTime() < comparisonDate;
        }

    }

    private getLastViewedTime(): Date { 
        if (Util.Browser.storageAvailable('localStorage')) {
            //check for storage item
            if (localStorage.getItem(this._localStorageKey)) {
                //attempt to convert the stored string into a real date
                let lastViewedTimeAsString = localStorage.getItem(this._localStorageKey);
                let lastViewedTime = DateTime.fromISO(lastViewedTimeAsString);
                if (lastViewedTime.invalidReason === null) {
                    return lastViewedTime.toJSDate();
                } else {
                    //delete the invalid iteam
                    localStorage.removeItem(this._localStorageKey);
                }
            }
        }
        return null;
    }

    private setLastViewedTime(dateToSet: Date = new Date()): void {
        if (Util.Browser.storageAvailable('localStorage')) {
            //check for storage item
            localStorage.setItem(this._localStorageKey,dateToSet.toISOString())
        }
    }
}