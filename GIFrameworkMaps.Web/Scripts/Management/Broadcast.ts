import { HubConnectionBuilder } from "@microsoft/signalr";

//global var defined in view. Replace me with another method :)
declare let appRoot: string;

export class Broadcast {
  public init() {
    const connection = new HubConnectionBuilder()
      .withUrl(`${appRoot}/broadcasthub`)
      .build();

    //Disable send button until connection is established

    const sendButton: HTMLButtonElement = document.getElementById(
      "sendButton",
    ) as HTMLButtonElement;
    const messageInput: HTMLInputElement = document.getElementById(
      "messageInput",
    ) as HTMLInputElement;
    const versionSelect: HTMLSelectElement = document.getElementById(
      "versionInput",
    ) as HTMLSelectElement;
    const msgSeveritySelect: HTMLSelectElement = document.getElementById(
      "messageSeverityInput",
    ) as HTMLSelectElement;
    const msgTypeSelect: HTMLSelectElement = document.getElementById(
      "messageTypeInput",
    ) as HTMLSelectElement;

    sendButton.disabled = true;

    connection
      .start()
      .then(() => {
        sendButton.disabled = false;
      })
      .catch((err) => {
        return console.error(err.toString());
      });

    connection.on(
      "ReceiveBroadcast",
      (messageType, messageSeverity, message, version) => {
        const msg = message
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        const encodedMsg = `Sending ${messageSeverity} ${messageType} to "/${version}" users with message: ${msg}`;
        const li = document.createElement("li");
        li.textContent = encodedMsg;
        document.getElementById("messagesList").appendChild(li);
        messageInput.value = "";
      },
    );

    document.getElementById("sendButton").addEventListener("click", (event) => {
      const msgType = msgTypeSelect.value;
      const msgSeverity = msgSeveritySelect.value;
      const message = messageInput.value;
      const version = versionSelect.value;
      if (message !== "") {
        connection
          .invoke("SendBroadcast", msgType, msgSeverity, message, version)
          .catch((err) => {
            const li = document.createElement("li");
            li.innerHTML = `The broadcast could not be sent.<br/>${err.toString()}`;
            document.getElementById("messagesList").appendChild(li);
            return console.error(err.toString());
          });
        //disable button for 5 seconds to prevent duplicated
        sendButton.disabled = true;
        window.setTimeout(() => {
          sendButton.disabled = false;
        }, 5000);
      }
      event.preventDefault();
    });
  }
}
