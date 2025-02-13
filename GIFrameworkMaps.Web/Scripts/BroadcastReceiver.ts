import * as signalR from "@microsoft/signalr";
import { Alert, AlertSeverity, AlertType, stripTrailingSlash } from "./Util";

export function init(versionSlug: string, appRoot: string) {
  const connection = new signalR.HubConnectionBuilder()
    .withUrl(
      `${document.location.protocol}//${stripTrailingSlash(
        appRoot,
      )}/broadcasthub`,
    )
    .build();

  connection.on(
    "ReceiveBroadcast",
    (messageType, messageSeverity, message, version) => {
      if (version === "all" || version === versionSlug) {
        const msg = message
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        switch (messageType) {
          case "Toast":
            showToast(messageSeverity, msg);
            break;
          case "Popup":
            showModal(messageSeverity, msg);
            break;
        }
      }
    },
  );

  connection.start().catch((err) => {
    return console.error(err.toString());
  });
}

function showToast(messageSeverity: string, msg: string) {
  let alertSeverity = AlertSeverity.Info;
  switch (messageSeverity) {
    case "Warning":
      alertSeverity = AlertSeverity.Warning;
      break;
    case "Danger":
      alertSeverity = AlertSeverity.Danger;
      break;
    case "Success":
      alertSeverity = AlertSeverity.Success;
      break;
  }
  const broadcastAlert = new Alert(
    AlertType.Toast,
    alertSeverity,
    "Message from administrators",
    msg,
    "#gifw-broadcast-toast",
  );
  broadcastAlert.show();
}

function showModal(messageSeverity: string, msg: string) {
  let alertSeverity = AlertSeverity.Info;
  switch (messageSeverity) {
    case "Warning":
      alertSeverity = AlertSeverity.Warning;
      break;
    case "Danger":
      alertSeverity = AlertSeverity.Danger;
      break;
    case "Success":
      alertSeverity = AlertSeverity.Success;
      break;
  }
  //broadcastToast.show();
  const broadcastAlert = new Alert(
    AlertType.Popup,
    alertSeverity,
    "Message from administrators",
    msg,
    "#gifw-broadcast-modal",
  );
  broadcastAlert.show();
}

