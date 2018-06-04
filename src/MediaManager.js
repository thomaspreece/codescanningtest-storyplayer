// @flow

import Hls from 'hls.js';
import logger from './logger';
import MediaInstance from './MediaInstance';

export default class MediaManager {
    _mediaInstancePool: Array<Object>
    _defaultConfig: Object
    _activeConfig: Object
    _inactiveConfig: Object
    _idTotal: number
    _foregroundMediaElement: HTMLVideoElement
    _backgroundMediaElement: HTMLAudioElement
    _debug: boolean
    _getPermissionToPlay: Function
    _permissionToPlay: boolean
    _hlsjsSupported: boolean

    constructor(
        foregroundMediaElement: HTMLVideoElement,
        backgroundMediaElement: HTMLAudioElement,
        debug: boolean = false,
    ) {
        this._mediaInstancePool = [];
        this._foregroundMediaElement = foregroundMediaElement;
        this._backgroundMediaElement = backgroundMediaElement;
        this._debug = debug;
        this._activeConfig = {
            hls: {
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                startFragPrefetch: true,
                startLevel: 3,
                debug: false,
            },
        };
        this._inactiveConfig = {
            hls: {
                maxBufferLength: 2,
                maxMaxBufferLength: 4,
                startFragPrefetch: true,
                startLevel: 3,
                debug: false,
            },
        };
        this._idTotal = 0;
        this._permissionToPlay = false;

        this._getPermissionToPlay = this._getPermissionToPlay.bind(this);

        if (Hls.isSupported()) {
            logger.info('HLS.js being used');
            this._hlsjsSupported = true;
        } else {
            this._hlsjsSupported = false;
        }
    }

    _getPermissionToPlay() {
        return this._permissionToPlay;
    }

    getMediaInstance(type: string): MediaInstance {
        let newMediaInstance;
        if (type === 'foreground') {
            newMediaInstance = new MediaInstance(
                this._getPermissionToPlay,
                this._activeConfig,
                this._inactiveConfig,
                this._idTotal,
                this._hlsjsSupported,
                this._foregroundMediaElement,
                this._debug,
            );
        } else if (type === 'background') {
            newMediaInstance = new MediaInstance(
                this._getPermissionToPlay,
                this._activeConfig,
                this._inactiveConfig,
                this._idTotal,
                this._hlsjsSupported,
                this._backgroundMediaElement,
                this._debug,
            );
        } else {
            logger.fatal('invalid hls type');
            throw new Error('invalid hls type');
        }

        this._idTotal += 1;
        this._mediaInstancePool.push({
            mediaInstance: newMediaInstance,
            type,
            active: true,
        });
        if (this._debug) {
            logger.info('New HLS Instance Created. ' +
            `Total HLS Instances: ${this._mediaInstancePool.length}.`);
        }
        return newMediaInstance;
    }


    returnMediaInstance(mediaInstance: MediaInstance) {
        mediaInstance.clearEvents();
        mediaInstance.detachMedia();
        mediaInstance.destroy();

        const id = mediaInstance.getId();
        this._mediaInstancePool.forEach((HlsPoolObject, index: number) => {
            if (HlsPoolObject.mediaInstance.getId() === id) {
                this._mediaInstancePool.splice(index, 1);
                if (this._debug) {
                    logger.info('MediaInstance Returned to Pool. ' +
                    `Total MediaInstance Instances: ${this._mediaInstancePool.length}.`);
                }
            }
        });
    }

    setPermissionToPlay(value: boolean) {
        this._permissionToPlay = value;
    }

    static get Events() {
        if (MediaManager._hlsjsSupported) {
            // Using HLS.js
            return {
                MANIFEST_PARSED: Hls.Events.MANIFEST_PARSED,
            };
        }
        // Using Video Element
        return {
            MANIFEST_PARSED: 'canplay',
        };
    }
}