import { DateTime } from "luxon";
import Shepherd from 'shepherd.js';
import { TourDetails } from "./Interfaces/Tour/TourDetails";
import { UserSettings } from "./UserSettings";

export class Tour {
    tourConfig: TourDetails;
    _localStorageKey: string;
    _versionId: number;
    constructor(versionId:number, tourConfig:TourDetails) {
        //generate the local storage access key
        this._localStorageKey = `TourLastViewed`
        this._versionId = versionId;
        this.tourConfig = tourConfig;
        //fix up the date
        if (this.tourConfig.updateDate !== null) {
            this.tourConfig.updateDate = new Date(this.tourConfig.updateDate);
        }
    }

    public showTourIfAppropriate(): void {
        if (this.showTour()) {
            //initialize shepherd

            const tour = new Shepherd.Tour({
                useModalOverlay: true,
                defaultStepOptions: {
                    cancelIcon: {
                        enabled: true
                    },
                    scrollTo: true,
                }
            });

            let i = 0;
            this.tourConfig.steps.sort((a, b) => a.stepNumber - b.stepNumber).forEach(step => {
                let buttons:Shepherd.Step.StepOptionsButton[] = [];
                if (i === 0) {
                    buttons = [
                        {
                            text: 'No thanks',
                            action: tour.cancel,
                            secondary: true
                        },
                        {
                            text: 'Start tour',
                            action: tour.next
                        }
                    ]
                }
                else if (i === this.tourConfig.steps.length - 1) {
                    buttons = [
                        {
                            text: 'Get mapping!',
                            action: tour.complete
                        }
                    ]
                }
                else {
                    buttons = [
                        {
                            text: 'Next',
                            action: tour.next
                        }
                        ]
                }
                
                let attachTo: Shepherd.Step.StepOptionsAttachTo = {};
                if (step.attachToPosition && step.attachToSelector) {
                    attachTo = {
                        element: step.attachToSelector,
                        on: (step.attachToPosition) as Shepherd.Step.PopperPlacement
                    }
                }

                tour.addStep({
                    id: step.id.toString(),
                    arrow: false,
                    title: step.title,
                    text: step.content,
                    attachTo: attachTo,
                    buttons: buttons
                }) 

                i++;

            })

            tour.start();

            //set last viewed time
            this.setLastViewedTime();
        }
        
    }

    private showTour(): boolean {
        switch (this.tourConfig.frequency) {
            case -1:
                //once
                return this.tourConfig.updateDate > this.getLastViewedTime();
            case 0:
                //always
                return true;
            default:
                //specified days
                let comparisonDate = DateTime.now().minus({ days: this.tourConfig.frequency }).toJSDate();
                return this.getLastViewedTime() < comparisonDate;
        }

    }

    private getLastViewedTime(): Date { 
        let lastViewedTimeSetting = UserSettings.getItem(this._localStorageKey, this._versionId);
        if (lastViewedTimeSetting) {
            //attempt to convert the stored string into a real date
            let lastViewedTime = DateTime.fromISO(lastViewedTimeSetting);
            if (lastViewedTime.invalidReason === null) {
                return lastViewedTime.toJSDate();
            } else {
                //delete the invalid iteam
                UserSettings.removeItem(this._localStorageKey, this._versionId)
            }
        }
        return null;
    }

    private setLastViewedTime(dateToSet: Date = new Date()): void {
        UserSettings.setItem(this._localStorageKey, dateToSet.toISOString(), this._versionId);
    }
}