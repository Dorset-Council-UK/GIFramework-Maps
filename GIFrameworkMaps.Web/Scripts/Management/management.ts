import 'bootstrap';
import { SelectWebService } from './SelectWebService';
import { Broadcast } from './Broadcast';
import { CreateLayerFromSource } from './CreateLayerFromSource';
import { CreateSource } from './CreateSource';

addEventListener("DOMContentLoaded", (event) => {
    //attach collapse caret changer
    const collapseLinks = document.querySelectorAll('[data-bs-toggle="collapse"]') as NodeListOf<HTMLElement>;
    if (collapseLinks) {
        collapseLinks.forEach(collapseLink => {
            let icon = collapseLink.querySelector('i.bi-caret-right, i.bi-caret-down');
            if (icon) {
                let target;
                if (collapseLink.tagName.toLowerCase() === 'a') {
                    const fullHref = (collapseLink as HTMLAnchorElement).href;
                    target = new URL(fullHref).hash;
                } else {
                    target = collapseLink.dataset.bsTarget;
                }
                const collapseEle = document.querySelector(target);
                collapseEle.addEventListener('hide.bs.collapse', e => {
                    icon.classList.remove('bi-caret-down');
                    icon.classList.add('bi-caret-right');
                })
                collapseEle.addEventListener('show.bs.collapse', e => {
                    icon.classList.add('bi-caret-down');
                    icon.classList.remove('bi-caret-right');
                })
            }
        });
    }
    //attach other general things that should appear everywhere
});

//TODO - This method of initializing stuff is HORRIBLE. Replace with something better
document.addEventListener('CreateLayerFromSourceInit', e => {
    new CreateLayerFromSource().init();
});
document.addEventListener('BroadcastInit', e => {
    new Broadcast().init();
});
document.addEventListener('SelectWebServiceInit', e => {
    new SelectWebService().init();
});
document.addEventListener('CreateSourceInit', e => {
    new CreateSource().init();
});