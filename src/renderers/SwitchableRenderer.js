// @flow
import BaseRenderer from './BaseRenderer';
import type { Representation, AssetCollectionFetcher, MediaFetcher } from '../romper';
import RendererFactory from './RendererFactory';
import SimpleAVRenderer from './SimpleAVRenderer';

export default class SwitchableRenderer extends BaseRenderer {
    _choiceRenderers: Array<?BaseRenderer>;
    _choiceDiv: HTMLDivElement;
    _fetchMedia: MediaFetcher;
    _currentRendererIndex: number;
    _previousRendererPlayheadTime: number;

    constructor(
        representation: Representation,
        assetCollectionFetcher: AssetCollectionFetcher,
        fetchMedia: MediaFetcher,
        target: HTMLElement,
    ) {
        super(representation, assetCollectionFetcher, fetchMedia, target);

        this._choiceDiv = document.createElement('div');
        this._choiceDiv.id = 'subrenderer';
        this._choiceRenderers = this._getChoiceRenderers();
        this._currentRendererIndex = 0;
        this._previousRendererPlayheadTime = 0;
    }

    // create a renderer for each choice
    _getChoiceRenderers() {
        if (this._representation.choices) {
            return this._representation.choices.map(choice =>
                RendererFactory(
                    choice.representation,
                    this._fetchAssetCollection,
                    this._fetchMedia,
                    this._choiceDiv,
                ));
        }
        return [];
    }

    // display the buttons as IMG elements in a list in a div
    _renderSwitchButtons() {
        const buttonPanel = document.createElement('div');
        const buttonList = document.createElement('ul');
        buttonPanel.className = 'switchbuttons';
        let i = 0;
        if (this._representation.choices) {
            this._representation.choices.forEach((choice) => {
                const index = i;
                const switchListItem = document.createElement('li');
                const switchButton = document.createElement('img');
                switchButton.setAttribute('role', 'button');
                switchButton.setAttribute('alt', choice.label);
                switchButton.addEventListener('click', () => {
                    this.switchToRepresentationAtIndex(index);
                });
                // switchButton.innerHTML = choice.label;
                this._setIcon(switchButton, choice.representation);
                switchListItem.appendChild(switchButton);
                buttonList.appendChild(switchListItem);
                i += 1;
            });
            buttonPanel.appendChild(buttonList);
            this._target.appendChild(buttonPanel);
        }
    }

    /**
     * Switch to the renderer for a given choice.  Has no effect if
     * index out of range
     *
     * @param {number} choiceIndex index of choices array to show
     */
    switchToRepresentationAtIndex(choiceIndex: number) {
        if (this._representation.choices && this._representation.choices[choiceIndex]) {
            this.emit('switchedRepresentation', this._representation.choices[choiceIndex]);
        }
        if (choiceIndex >= 0 && choiceIndex < this._choiceRenderers.length) {
            const currentChoice = this._choiceRenderers[this._currentRendererIndex];
            if (currentChoice) {
                if (currentChoice instanceof SimpleAVRenderer) {
                    // store playhead time
                    this._previousRendererPlayheadTime = currentChoice.getCurrentTime();
                }
                currentChoice.destroy();
            }
            this._currentRendererIndex = choiceIndex;
            const newChoice = this._choiceRenderers[this._currentRendererIndex];
            if (newChoice) newChoice.start();
            if (newChoice && newChoice instanceof SimpleAVRenderer) {
                // sync playhead time
                newChoice.setStartTime(this._previousRendererPlayheadTime);
            }
        }
    }

    /**
     * Switch to the renderer for a given choice.  Has no effect if
     * label not associated with any choice
     *
     * @param {string} choiceLabel label of choice to show
     */
    switchToRepresentationWithLabel(choiceLabel: string) {
        if (this._representation.choices) {
            this._representation.choices.forEach((choice, index) => {
                if (choiceLabel === choice.label) {
                    this.switchToRepresentationAtIndex(index);
                }
            });
        }
    }

    start() {
        this._target.appendChild(this._choiceDiv);
        this._renderSwitchButtons();

        // start subrenderer for first choice
        const firstChoice = this._choiceRenderers[this._currentRendererIndex];
        if (firstChoice) {
            firstChoice.start();
        }
        // this._renderDataModelInfo();
    }

    // return the currently chosen representation, unless we can't
    // in which case return main Switchable Representation
    getRepresentation() {
        if (this._representation.choices && this._representation
            .choices.length >= this._currentRendererIndex) {
            return this._representation
                .choices[this._currentRendererIndex].representation;
        }
        return this._representation;
    }

    // fetch the icon asset for the given representation and set
    // the source of the IMG element
    _setIcon(element: HTMLImageElement, choiceRepresentation: Representation) {
        if (choiceRepresentation.asset_collection.icon) {
            this._fetchAssetCollection(choiceRepresentation.asset_collection.icon.default)
                .then((icon) => {
                    if (icon.assets.image_src) {
                        this._fetchMedia(icon.assets.image_src).then((mediaUrl) => {
                            // console.log('FETCHED ICON FROM MS MEDIA!', mediaUrl);
                            element.setAttribute('src', mediaUrl);
                        }).catch((err) => { console.error(err, 'Notfound'); });
                    }
                });
        }
    }

    // display some text that shows what we're supposed to be rendering, according
    // to the data model
    _renderDataModelInfo() {
        // next just displays info for debug
        const para = document.createElement('p');
        para.textContent = this._representation.name;
        const optPara = document.createElement('p');
        optPara.textContent = 'Options';
        this._target.appendChild(para);
        this._target.appendChild(optPara);

        const switchlist = document.createElement('ul');
        this._target.appendChild(switchlist);
        const iconData = document.createElement('p');
        iconData.textContent = 'icon: ';
        this._target.appendChild(iconData);

        if (this._representation.choices) {
            this._representation.choices.forEach((choice) => {
                const choiceLabel = choice.label;
                let choiceRepresentationDetail = '';
                if (choice.representation) {
                    choiceRepresentationDetail = choice.representation.name;
                }
                const switchitem = document.createElement('li');
                switchitem.textContent = `${choiceLabel}: ${choiceRepresentationDetail}`;
                switchlist.appendChild(switchitem);
            });
        }

        if (this._representation.asset_collection.icon) {
            this._fetchAssetCollection(this._representation.asset_collection.icon.default)
                .then((icon) => {
                    iconData.textContent += `${icon.name}`;
                    if (icon.assets.image_src) {
                        iconData.textContent += ` from ${icon.assets.image_src}`;
                    }
                });
        } else {
            iconData.textContent += 'none';
        }
    }

    destroy() {
        while (this._target.lastChild) {
            this._target.removeChild(this._target.lastChild);
        }
        super.destroy();
    }
}