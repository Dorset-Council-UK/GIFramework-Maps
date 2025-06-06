import "bootstrap";
import { SelectWebService } from "./SelectWebService";
import { Broadcast } from "./Broadcast";
import { CreateLayerFromSource } from "./CreateLayerFromSource";
import { CreateSource } from "./CreateSource";
import accessibleAutocomplete from "accessible-autocomplete";
import { Tooltip } from "bootstrap";

declare let appRoot: string;
declare let authRulesEndpoint: string;

addEventListener("DOMContentLoaded", () => {
  //attach collapse caret changer
  const collapseLinks = document.querySelectorAll(
    '[data-bs-toggle="collapse"]',
  ) as NodeListOf<HTMLElement>;
  if (collapseLinks) {
    collapseLinks.forEach((collapseLink) => {
      const icon = collapseLink.querySelector(
        "i.bi-caret-right, i.bi-caret-down",
      );
      if (icon) {
        let target;
        if (collapseLink.tagName.toLowerCase() === "a") {
          const fullHref = (collapseLink as HTMLAnchorElement).href;
          target = new URL(fullHref).hash;
        } else {
          target = collapseLink.dataset.bsTarget;
        }
        const collapseEle = document.querySelector(target);
        collapseEle.addEventListener("hide.bs.collapse", () => {
          icon.classList.remove("bi-caret-down");
          icon.classList.add("bi-caret-right");
        });
        collapseEle.addEventListener("show.bs.collapse", () => {
          icon.classList.add("bi-caret-down");
          icon.classList.remove("bi-caret-right");
        });
      }
    });
  }
  //attach accessible autocomplete
  const autocompleteElements = document.querySelectorAll(
    "select[data-autocomplete]",
  );
  if (autocompleteElements) {
    autocompleteElements.forEach((ele) => {
      accessibleAutocomplete.enhanceSelectElement({ selectElement: ele });
    });
  }
  //attach other general things that should appear everywhere
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  [...tooltipTriggerList].map(tooltipTriggerEl => new Tooltip(tooltipTriggerEl));
});

//TODO - This method of initializing stuff is HORRIBLE. Replace with something better
document.addEventListener("CreateLayerFromSourceInit", () => {
  new CreateLayerFromSource().init(appRoot, authRulesEndpoint);
});
document.addEventListener("BroadcastInit", () => {
  new Broadcast().init();
});
document.addEventListener("SelectWebServiceInit", () => {
  /*variables passed from index.cshtml. Use sparingly*/
  new SelectWebService().init(appRoot, authRulesEndpoint);
});
document.addEventListener("CreateSourceInit", () => {
  new CreateSource().init();
});
