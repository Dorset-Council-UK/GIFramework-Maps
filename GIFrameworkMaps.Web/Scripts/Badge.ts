export function createBadge(content: string, classes: string[] = []) {
  const element = document.createElement("span");
  element.innerHTML = content;
  element.classList.add(...["badge"].concat(classes));
  return element;
}

export function createErrorBadge(){
  return createBadge("Error", [
    "badge-error",
    "rounded-pill",
    "border",
    "bg-danger",
  ]);
};
export function createInvisibleBadge() {
  return createBadge("Invisible", [
    "badge-invisible",
    "rounded-pill",
    "border",
    "border-secondary",
    "text-secondary",
  ]);
};
export function createOutOfRangeBadge() {
  return createBadge("Out of range", [
    "badge-out-of-range",
    "rounded-pill",
    "border",
    "bg-warning",
    "text-dark",
  ]);
};

