import { Modal } from "bootstrap";
import { DateTime } from "luxon";
import { WelcomeMessage } from "./Interfaces/WelcomeMessage";
import { UserSettings } from "./UserSettings";

export class Welcome {
  config: WelcomeMessage;
  _localStorageKey: string;
  _versionId: number;
  constructor(config: WelcomeMessage, versionId: number) {
    this.config = config;
    //fix up the date
    if (this.config.updateDate !== null) {
      this.config.updateDate = new Date(this.config.updateDate);
    }
    //generate the local storage access key
    this._localStorageKey = `WelcomeLastViewed`;
    this._versionId = versionId;
  }

  /**
   * Shows the welcome message depending on the welcome message configuration
   * @returns {boolean} Boolean indicating whether the welcome message was shown to the user
   * */
  public showWelcomeMessageIfAppropriate(): boolean {
    const modal = document.querySelector("#welcome-modal");
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
      default: {
        //specified days
        const comparisonDate = DateTime.now()
          .minus({ days: this.config.frequency })
          .toJSDate();
        return this.getLastViewedTime() < comparisonDate;
      }
    }
  }

  private getLastViewedTime(): Date {
    const lastViewedTimeSetting = UserSettings.getItem(
      this._localStorageKey,
      this._versionId,
    );
    if (lastViewedTimeSetting) {
      //attempt to convert the stored string into a real date
      const lastViewedTime = DateTime.fromISO(lastViewedTimeSetting);
      if (lastViewedTime.invalidReason === null) {
        return lastViewedTime.toJSDate();
      } else {
        //delete the invalid iteam
        UserSettings.removeItem(this._localStorageKey, this._versionId);
      }
    }
    return null;
  }

  private setLastViewedTime(dateToSet: Date = new Date()): void {
    UserSettings.setItem(
      this._localStorageKey,
      dateToSet.toISOString(),
      this._versionId,
    );
  }
}
