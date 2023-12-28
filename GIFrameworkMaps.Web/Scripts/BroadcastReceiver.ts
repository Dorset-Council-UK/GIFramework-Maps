import * as signalR from "@microsoft/signalr";
import { Alert, AlertSeverity, AlertType, Helper } from "./Util";

export class BroadcastReceiver {
    static init(versionSlug:string, appRoot:string) {
        const connection = new signalR.HubConnectionBuilder().withUrl(`${document.location.protocol}//${Helper.stripTrailingSlash(appRoot)}/broadcasthub`).build();

        connection.on("ReceiveBroadcast", (messageType, messageSeverity, message, version) => {
            if (version === "all" || version === versionSlug) {
                const msg = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                switch (messageType) {
                    case "Toast":
                        BroadcastReceiver.showToast(messageSeverity,msg);
                        break;
                    case "Popup":
                        BroadcastReceiver.showModal(messageSeverity, msg);
                        break;
                }
            }
        });

        connection.start().catch((err) => {
            return console.error(err.toString());
        });
    }

    static showToast(messageSeverity:string, msg:string) {

        let alertSeverity = AlertSeverity.Info;
        switch (messageSeverity) {
            case "Warning":
                alertSeverity = AlertSeverity.Warning
                break;
            case "Danger":
                alertSeverity = AlertSeverity.Danger
                break;
            case "Success":
                alertSeverity = AlertSeverity.Success
                break;
        }
        const broadcastAlert = new Alert(AlertType.Toast, alertSeverity, "Message from administrators", msg, "#gifw-broadcast-toast")
        broadcastAlert.show();

    }

    static showModal(messageSeverity: string, msg: string) {

        let alertSeverity = AlertSeverity.Info;
        switch (messageSeverity) {
            case "Warning":
                alertSeverity = AlertSeverity.Warning
                break;
            case "Danger":
                alertSeverity = AlertSeverity.Danger
                break;
            case "Success":
                alertSeverity = AlertSeverity.Success
                break;
        }
        //broadcastToast.show();
        const broadcastAlert = new Alert(AlertType.Popup, alertSeverity, "Message from administrators", msg, "#gifw-broadcast-modal")
        broadcastAlert.show();
    }

}