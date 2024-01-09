declare let CookieControl: { open: () => void };
declare let configure_cookie_control: string;

function loadCookieControl() {
  //This allows the use of a cookie control
  if (
    configure_cookie_control == "Civic Cookie Control" &&
    typeof CookieControl != "undefined"
  ) {
    document
      .getElementById("CookieControlLink")
      .addEventListener("click", CookieControl.open);
  }
}
window.loadCookieControl = loadCookieControl;
