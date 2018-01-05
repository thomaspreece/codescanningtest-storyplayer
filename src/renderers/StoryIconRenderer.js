// @flow

import EventEmitter from 'events';
import type { AssetCollection, AssetCollectionFetcher, MediaFetcher } from '../romper';
import type { StoryPathItem } from '../StoryPathWalker';

export type AssetCollectionPair = {
    default: ?AssetCollection,
    active: ?AssetCollection,
};

// Render story data (i.e., not refreshed every NE)
// currently focused on chapter icons
export default class StoryIconRenderer extends EventEmitter {
    _pathItemList: Array<StoryPathItem>;
    _fetchAssetCollection: AssetCollectionFetcher;
    _fetchMedia: MediaFetcher;
    _target: HTMLDivElement;
    _iconElementMap: { [key: string]: ?HTMLElement } // map of representationIds to icon <img>s
    _currentRepresentationId: string; // the id of the current representation
    _deepestCommonSubstory: string; // the story id of the deepest story with all icons
    _iconListElement: HTMLElement; // the <ul> containing the icons
    _iconUrlMap: { [key: string]: { default: ?string, active: ?string } }; // urls of default and active icons

    /**
     * Create a new instance of a StoryIconRenderer
     *
     * @param {Array<StoryPathItem} pathItemList - an array of StoryPathItems that make a
     *      linear story
     * @param {AssetCollectionFetcher} fetchAssetCollection a function for collecting
     *      AssetCollections
     * @param {MediaFetcher} fetchMedia a function for fetching Media
     * @param {HTMLDivElement} target - an HTML element within which to render the story icons
     */
    constructor(
        pathItemList: Array<StoryPathItem>,
        fetchAssetCollection: AssetCollectionFetcher,
        fetchMedia: MediaFetcher,
        target: HTMLDivElement,
    ) {
        super();
        this._pathItemList = pathItemList;
        this._fetchAssetCollection = fetchAssetCollection;
        this._fetchMedia = fetchMedia;
        this._target = target;
        this._iconElementMap = {};
        this._iconUrlMap = {};
    }

    start() {
        this._currentRepresentationId = this._pathItemList[0].representation.id;
        this._getIconAssets().then((iconAssets) => { // fetch AssetCollections
            this._buildUrlMap(iconAssets); // get urls for each icon
            const iconImgElements = this._buildAssets(); // build icons
            this._deepestCommonSubstory = this._findSubStories();
            this._iconListElement = document.createElement('ul');
            this._iconListElement.id = 'chapterIcons';
            iconImgElements.forEach((iconImageElement) => { // add icons to DOM
                const iconListItem = document.createElement('li');
                iconListItem.appendChild(iconImageElement);
                this._iconListElement.appendChild(iconListItem);
            });
            this._target.appendChild(this._iconListElement);
            this._showHideTarget();
        });
    }

    // handle click on icon - emit message including narrative element id
    _iconClickHandler(representationId: string) {
        const storyPathItems = this._pathItemList.filter(pathitem =>
            pathitem.representation && (pathitem.representation.id === representationId));
        if (storyPathItems.length === 1) {
            this.emit('jumpToNarrativeElement', storyPathItems[0].narrative_element.id);
        }
    }

    // go through the list of path items and collect the AssetCollection for the
    // default and active icons of each
    _getIconAssets(): Promise<Array<AssetCollectionPair>> {
        const promises = [];
        this._pathItemList.forEach((pathItem) => {
            if (pathItem.representation.asset_collection.icon) {
                const icon = pathItem.representation.asset_collection.icon;
                const defaultAssetCollectionId = icon.default;
                promises.push(this._fetchAssetCollection(defaultAssetCollectionId));
                if (icon.active) {
                    promises.push(this._fetchAssetCollection(icon.active));
                } else {
                    promises.push(Promise.resolve(null));
                }
            } else {
                promises.push(Promise.resolve(null));
                promises.push(Promise.resolve(null));
            }
        });

        const iconAssetList = []; // list of icon asset collections in AssetCollectionPair objects
        return Promise.all(promises).then((iconAssets) => {
            for (let i = 0; i < iconAssets.length; i += 2) {
                const urls = {
                    default: iconAssets[i],
                    active: iconAssets[i + 1],
                };
                iconAssetList.push(urls);
            }
            return Promise.resolve(iconAssetList);
        });
    }

    // go through the list of AssetCollections for icons and
    // and build a map of urls of default and active icons for each representationId
    _buildUrlMap(assets: Array<AssetCollectionPair>) {
        assets.forEach((iconAssets, i) => {
            const representationId = this._pathItemList[i].representation.id;
            let defaultUrl = null;
            let activeUrl = null;
            if (iconAssets.default && iconAssets.default.assets.image_src) {
                defaultUrl = iconAssets.default.assets.image_src;
            }
            if (iconAssets.active && iconAssets.active.assets.image_src) {
                activeUrl = iconAssets.active.assets.image_src;
            }
            // store urls
            this._iconUrlMap[representationId] = {
                default: defaultUrl,
                active: activeUrl,
            };
        });
    }

    // go through the list of pathItems and build some icons
    // collect a map of these to representationIds
    _buildAssets(): Array<HTMLImageElement> {
        const iconElementList = []; // list of icon <IMG> elements
        this._pathItemList.forEach((pathItem) => {
            const representationId = pathItem.representation.id;
            const iconUrl = this._iconUrlMap[representationId];
            if (iconUrl.default) {
                const url = iconUrl.default;
                const newIcon = this._buildIconImgElement(
                    representationId,
                    url,
                );
                iconElementList.push(newIcon);
                this._iconElementMap[representationId] = newIcon;
            } else {
                this._iconElementMap[representationId] = null;
            }
        });
        return iconElementList;
    }

    // build icon with click handler
    _buildIconImgElement(representationId: string, sourceUrl: string): HTMLImageElement {
        const newIcon = document.createElement('img');
        newIcon.setAttribute('src', sourceUrl);
        newIcon.addEventListener('click', () => this._iconClickHandler(representationId));
        if (representationId === this._currentRepresentationId) {
            newIcon.className = 'activeIcon';
        } else {
            newIcon.className = 'inactiveIcon';
        }
        return newIcon;
    }

    /**
     * Handle a change in the main story state - moved to a new NarrativeElement
     *
     * @param {string} representationId the id of the representation being rendered
     * for the current narrative element
     */
    handleNarrativeElementChanged(representationId: string) {
        // probably also want to check that the representations in our path map
        // are still those that the reasoner is selecting
        this._currentRepresentationId = representationId;
        Object.keys(this._iconElementMap).forEach((mapKey) => {
            if (this._iconElementMap[mapKey]) {
                const iconElement = this._iconElementMap[mapKey];
                iconElement.className = 'inactiveIcon';
                if (this._iconUrlMap[mapKey] && this._iconUrlMap[mapKey].default) {
                    iconElement.setAttribute('src', this._iconUrlMap[mapKey].default);
                }
            }
        });
        if (this._iconElementMap[representationId]) {
            this._iconElementMap[representationId].className = 'activeIcon';
            if (this._iconUrlMap[representationId] && this._iconUrlMap[representationId].active) {
                this._iconElementMap[representationId]
                    .setAttribute('src', this._iconUrlMap[representationId].active);
            }
        }
        this._showHideTarget();
    }

    // get the position of the given representation in the story path
    _getRepresentationIndex(representationId: string): number {
        let index = -1;
        this._pathItemList.forEach((storyPathItem, i) => {
            if (storyPathItem.representation
                && storyPathItem.representation.id === representationId) {
                index = i;
            }
        });
        return index;
    }

    // show or hide the target of this renderer according to whether we are in a substory
    _showHideTarget() {
        const currentRepIndex = this._getRepresentationIndex(this._currentRepresentationId);
        const currentPathItem = this._pathItemList[currentRepIndex];
        // console.log('in', currentPathItem, '- icon story is:', this._deepestCommonSubstory);

        this._target.classList.remove('active');
        this._target.classList.remove('inactive');
        if (currentPathItem.stories.indexOf(this._deepestCommonSubstory) === -1) {
            this._target.classList.add('inactive');
        } else {
            this._target.classList.add('active');
        }
    }

    // find the deepest substory that includes all the representations with icons
    _findSubStories(): string {
        const activeElements = [];
        Object.keys(this._iconElementMap).forEach((representationId, index) => {
            if (this._iconElementMap[representationId] !== null) { // there is an icon
                const pathItem = this._pathItemList[index]; // get the corresponding path icon
                activeElements.push(pathItem.stories.slice(0)); // add the stories
            }
        });
        const commonPath = StoryIconRenderer._findLongestCommonList(activeElements);
        return commonPath[commonPath.length - 1];
    }

    // find the longest common start shared by all arrays
    static _findLongestCommonList(list: Array<Array<string>>): Array<string> {
        const commonPath = list[0];
        list.forEach((ae) => {
            // trim common to same length
            while (commonPath.length > ae.length) commonPath.pop();
            // trim uncommon stories from end
            for (let i = commonPath.length - 1; i > 0; i -= 1) {
                if (commonPath[i] !== ae[i]) commonPath.pop();
            }
        });
        return commonPath;
    }
}