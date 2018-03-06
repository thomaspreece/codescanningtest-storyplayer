// @flow

import VideoContext from 'videocontext';
// @flowignore
import Hls from '../../node_modules/hls.js/dist/hls';
import logger from '../logger';

let videoContext;
let canvas;

const nodeRepresentationMap = {};

export default class CustomVideoContext extends VideoContext {
    guessContextFinishTime() {
        const snapshot = this.snapshot();
        let maxDuration = 0;
        Object.keys(snapshot.nodes).forEach((sn) => {
            const node = snapshot.nodes[sn];
            if (node.type === 'VideoNode' && node.stop !== Infinity) {
                if (node.stop > maxDuration) maxDuration = node.stop;
            }
        });
        return maxDuration;
    }

    static registerVideoContextClient(id: string) {
        nodeRepresentationMap[id] = false;
    }

    static unregisterVideoContextClient(id: string) {
        delete nodeRepresentationMap[id];
    }

    static showVideoContextForClient(id: string) {
        if (nodeRepresentationMap.hasOwnProperty(id)) {
            nodeRepresentationMap[id] = true;
        } else {
            logger.warn(`representation ${id} not registered on VCtx`);
        }
        CustomVideoContext._calculateVisibility();
    }

    static hideVideoContextForClient(id: string) {
        if (nodeRepresentationMap.hasOwnProperty(id)) {
            nodeRepresentationMap[id] = false;
        } else {
            logger.warn(`representation${id} not registered on VCtx`);
        }
        CustomVideoContext._calculateVisibility();
    }

    static _calculateVisibility() {
        let show = false;
        Object.keys(nodeRepresentationMap).forEach((user) => {
            show = show || nodeRepresentationMap[user];
        });
        canvas.style.display = show ? 'flex' : 'none';
    }

    hls(
        m3u8: Promise<string>,
        sourceOffset: number = 0,
        preloadTime: number = 4,
        attributes: Object = {},
    ) {
        const videoElement = document.createElement('video');
        // eslint-disable-next-line no-param-reassign
        attributes.crossorigin = 'anonymous';
        // $FlowIgnore
        const videoNode: Object = this.video(videoElement, sourceOffset, preloadTime, attributes);

        videoNode.registerCallback('load', async () => {
            const manifestUrl = await m3u8;

            videoNode.hlsplayer = new Hls({ startFragPrefetch: true, startLevel: 3 });

            if (manifestUrl.indexOf('.m3u8') !== -1) {
                videoNode.hlsplayer.loadSource(manifestUrl);
                videoNode.hlsplayer.attachMedia(videoElement);
                videoNode.hlsplayer.on(Hls.Events.MANIFEST_PARSED, () => {
                    videoElement.play();
                });
            }
        });

        videoNode.registerCallback('play', () => {
        });

        videoNode.registerCallback('destroy', (node: Object) => {
            if (node.hlsplayer) {
                node.hlsplayer.destroy();
            }
        });
        return videoNode;
    }
}

export function getCanvas() {
    return canvas;
}

export function getNodeRepresentationMap() {
    return nodeRepresentationMap;
}

export function getVideoContext() {
    if (!videoContext) {
        canvas = document.createElement('canvas');
        canvas.className = 'romper-video-element';
        canvas.setAttribute('width', '1024px');
        canvas.setAttribute('height', '576px');
        videoContext = new CustomVideoContext(canvas);
    }
    return videoContext;
}

export function createVideoContextNodeForUrl(mediaUrl: string) {
    let videoNode;
    // if mediaUrl is hls
    if (mediaUrl.indexOf('.m3u8') !== -1) {
        videoNode = getVideoContext().hls(mediaUrl, 0, 4);
    } else {
        videoNode = getVideoContext().video(mediaUrl, 0, 4);
    }

    return videoNode;
}