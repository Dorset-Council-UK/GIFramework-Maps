export function createSpinner(classes: string[] = []): HTMLDivElement {
  const element = document.createElement("div");
  element.classList.add(...["spinner", "spinner-border"].concat(classes));
  element.setAttribute("role", "status");
  element.setAttribute("counter", "0");
  return element;
}

export function decrementCounter(spinner: HTMLDivElement) {
  const count = spinner.getAttribute("counter");
  if (!count) {
    spinner.setAttribute("counter", "0");
  } else {
    const newCountInt = parseInt(count) - 1;
    spinner.setAttribute("counter", newCountInt.toString());
  }
}

export function hasCounter(spinner: HTMLElement) {
  const count = spinner.getAttribute("counter");
  if (!count || parseInt(count) <= 0) {
    return false;
  }
  return true;
}

export function incrementCounter(spinner: HTMLDivElement) {
  const count = spinner.getAttribute("counter");
  if (!count) {
    spinner.setAttribute("counter", "1");
  } else {
    const newCountInt = parseInt(count) + 1;
    spinner.setAttribute("counter", newCountInt.toString());
  }
}

export function createSmallSpinner() {
  return createSpinner(["spinner-border-sm"]);
};

