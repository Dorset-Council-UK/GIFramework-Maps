import * as signalR from "@microsoft/signalr";
import { Util } from "./Util";

export class BroadcastReceiver {
    static init(versionSlug:string, appRoot:string) {
        let connection = new signalR.HubConnectionBuilder().withUrl(`${document.location.protocol}//${Util.Helper.stripTrailingSlash(appRoot)}/broadcasthub`).build();

        connection.on("ReceiveBroadcast", function (messageType, messageSeverity, message, version) {
            if (version === "all" || version === versionSlug) {
                var msg = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                var encodedMsg = `${messageSeverity}: ${msg} (${messageType})`;
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

        connection.start().catch(function (err) {
            return console.error(err.toString());
        });
    }

    static showToast(messageSeverity:string, msg:string) {

        let alertSeverity = Util.AlertSeverity.Info;
        switch (messageSeverity) {
            case "Warning":
                alertSeverity = Util.AlertSeverity.Warning
                break;
            case "Danger":
                alertSeverity = Util.AlertSeverity.Danger
                break;
            case "Success":
                alertSeverity = Util.AlertSeverity.Success
                break;
        }
        let broadcastAlert = new Util.Alert(Util.AlertType.Toast, alertSeverity, "Message from administrators", msg, "#gifw-broadcast-toast")
        broadcastAlert.show();

    }

    static showModal(messageSeverity: string, msg: string) {

        let alertSeverity = Util.AlertSeverity.Info;
        switch (messageSeverity) {
            case "Warning":
                alertSeverity = Util.AlertSeverity.Warning
                break;
            case "Danger":
                alertSeverity = Util.AlertSeverity.Danger
                break;
            case "Success":
                alertSeverity = Util.AlertSeverity.Success
                break;
        }
        //broadcastToast.show();
        let broadcastAlert = new Util.Alert(Util.AlertType.Popup, alertSeverity, "Message from administrators", msg, "#gifw-broadcast-modal")
        broadcastAlert.show();
    }

}