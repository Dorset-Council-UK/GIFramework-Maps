"use strict";

var connection = new signalR.HubConnectionBuilder().withUrl(`${appRoot}/broadcasthub`).build();

//Disable send button until connection is established
document.getElementById("sendButton").disabled = true;

connection.start().then(function () {
    document.getElementById("sendButton").disabled = false;
}).catch(function (err) {
    return console.error(err.toString());
});

connection.on("ReceiveBroadcast", function (messageType, messageSeverity, message, version) {
    var msg = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    var encodedMsg = `Sending ${messageSeverity} ${messageType} to "/${version}" users with message: ${msg}`;
    var li = document.createElement("li");
    li.textContent = encodedMsg;
    document.getElementById("messagesList").appendChild(li);
    document.getElementById("messageInput").value = "";
});

document.getElementById("sendButton").addEventListener("click", function (event) {
    var msgType = document.getElementById("messageTypeInput").value;
    var msgSeverity = document.getElementById("messageSeverityInput").value;
    var message = document.getElementById("messageInput").value;
    var version = document.getElementById("versionInput").value;
    if (message !== "") {
        connection.invoke("SendBroadcast", msgType, msgSeverity, message, version).catch(function (err) {
            var li = document.createElement("li");
            li.innerHTML = `The broadcast could not be sent.<br/>${err.toString()}`;
            document.getElementById("messagesList").appendChild(li);
            return console.error(err.toString());
        });
        //disable button for 5 seconds to prevent duplicated
        document.getElementById("sendButton").disabled = true;
        window.setTimeout(function () { document.getElementById("sendButton").disabled = false }, 5000);
    } else {

    }
    event.preventDefault();

});