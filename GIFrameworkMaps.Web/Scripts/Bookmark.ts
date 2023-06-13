import { Modal } from "bootstrap";
import { GIFWMap } from "./Map";

export class Bookmark {
    gifwMapInstance: GIFWMap;
    constructor(gifwMapInstance: GIFWMap) {
        this.gifwMapInstance = gifwMapInstance;

    }

    public init() {
        this.getBookmarks();
        this.addListeners();
    }

    private addListeners() {
        //attach event listener to bookmark button
        const bookmarkButton = document.getElementById('gifw-add-bookmark');
        bookmarkButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.openAddBookmarkModal();
        });

    }

    /**
     * Gets the bookmarks for the user and adds them to the bookmarks list
     */
    private getBookmarks() {
        const bookmarksListContainer = document.querySelector('#gifw-bookmarks-list');

        bookmarksListContainer.querySelectorAll('.bookmark-item')?.forEach((item) => { item.remove() });

        fetch(`${document.location.protocol}//${this.gifwMapInstance.config.appRoot}API/UserBookmarks`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length !== 0) {
                    data.forEach((bookmark: any) => {
                        console.log(bookmark);
                        const newBookmark = document.createElement('a');
                        newBookmark.href = `#gifw-zoomtobookmark-${bookmark.id}`;
                        newBookmark.className = "bookmark-item dropdown-item";
                        newBookmark.innerText = bookmark.name;
                        newBookmark.dataset.gifwBookmarkXCoordinate = bookmark.x;
                        newBookmark.dataset.gifwBookmarkYCoordinate = bookmark.y;
                        newBookmark.dataset.gifwBookmarkZoom = bookmark.zoom;
                        //newBookmark.querySelector('.bookmark-remove').addEventListener('click', (e) => {
                        //    e.preventDefault();
                        //    this.removeBookmark(bookmark.id);
                        //});
                        //newBookmark.addEventListener('click', (e) => {
                        //    e.preventDefault();
                        //    this.zoomToBookmark(bookmark);
                        //});
                        const newBookmarkListItem = document.createElement('li');
                        newBookmarkListItem.appendChild(newBookmark);
                        bookmarksListContainer.insertAdjacentElement('afterbegin', newBookmarkListItem);
                    });
                } else {
                    bookmarksListContainer.insertAdjacentHTML('afterbegin', `<li><span class="dropdown-item-text">No bookmarks saved yet</span></li>`);
                }
            });
    }

    /**
     * Opens the Add Bookmark modal
     */
    private openAddBookmarkModal() {
        const modal = Modal.getOrCreateInstance('#add-bookmark-modal');
        modal.show();
    }

    //private zoomToBookmark(bookmark:any) {
    //    console.log(bookmark)
    //}
}