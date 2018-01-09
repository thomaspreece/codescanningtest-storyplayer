// @flow

import BaseRenderer from './BaseRenderer';
import type { Representation, AssetCollectionFetcher, MediaFetcher } from '../romper';

import CustomVideoContext from '../utils/custom-video-context';

// @flowignore
import Hls from '../../node_modules/hls.js/dist/hls';

export default class SimpleAVRenderer extends BaseRenderer {
    _fetchMedia: MediaFetcher;
    _hls: Object;
    _videoElement: HTMLVideoElement;
    _canvas: Object;

    constructor(
        representation: Representation,
        assetCollectionFetcher: AssetCollectionFetcher,
        fetchMedia: MediaFetcher,
        target: HTMLElement,
    ) {
        super(representation, assetCollectionFetcher, fetchMedia, target);
        if (Hls.isSupported()) {
            this._hls = new Hls();
        }
    }

    start() {
        super.start();
        this.renderVideoElement();
        this.renderControlBar();
        // this.renderDataModelInfo();
    }

    renderVideoElement() {
        /* TEST VIDEO CTX HERE>... */


        this._videoElement = document.createElement('video');

        // set CSS classname
        this._videoElement.className = 'romper-video-element';

        // set its source
        if (this._representation.asset_collection.foreground) {
            this._fetchAssetCollection(this._representation.asset_collection.foreground).then((fg) => {
                if (fg.assets.av_src) {
                    this._fetchMedia(fg.assets.av_src)
                        .then((mediaUrl) => {
                            this.populateVideoElement(this._videoElement, mediaUrl);
                        })
                        .catch((err) => {
                            console.error(err, 'Notfound');
                        });
                }
            });
        } else {
            // console.error('No foreground source for AVRenderer');
        }

        // render it
        this._target.appendChild(this._videoElement);

        // automatically move on at video end
        this._videoElement.addEventListener('ended', () => {
            super.complete();
        });

        this.videoContextExperiment();
    }

    populateVideoElement(videoElement: HTMLVideoElement, mediaUrl: string) {
        // if mediaUrl is hls
        if (mediaUrl.indexOf('.m3u8') !== -1) {
            this._hls.loadSource(mediaUrl);
            this._hls.attachMedia(videoElement);
            this._hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoElement.play();
            });
        } else {
            videoElement.setAttribute('src', mediaUrl);
            videoElement.addEventListener('loadeddata', () => {
                videoElement.play();
            });
        }
    }

    // Add player controls to the DOM and listen for events
    renderControlBar() {
        // target element by its class name rather than ID as there will be multiple videos on the page...
        const video = this._videoElement;

        // buttons
        const playPause = document.createElement('button');
        playPause.className = 'play-pause--playing';
        const playVideo = () => {
            video.play();
            playPause.className = 'play-pause--playing';
        };
        const pauseVideo = () => {
            video.pause();
            playPause.className = 'play-pause--paused';
        };

        playPause.addEventListener('click', () => {
            if (video.paused === true) {
                playVideo();
            } else {
                pauseVideo();
            }
        });

        const mute = document.createElement('button');
        mute.className = 'mute-button--unmuted';
        mute.addEventListener('click', () => {
            if (!video.muted) {
                // Mute the video
                video.muted = true;
                mute.className = 'mute-button--muted';
            } else {
                // Unmute the video
                video.muted = false;
                mute.className = 'mute-button--unmuted';
            }
        });

        const fullscreen = document.createElement('button');
        fullscreen.className = 'fullscreen';
        // Event listener for the full-screen button
        fullscreen.addEventListener('click', () => {
            if (video.requestFullscreen) {
                // @flowignore
                video.requestFullscreen();
            } else if (video.mozRequestFullScreen) {
                // @flowignore
                video.mozRequestFullScreen(); // Firefox
            } else if (video.webkitRequestFullscreen) {
                // @flowignore
                video.webkitRequestFullscreen(); // Chrome and Safari
            }
        });

        // ranges
        const volume = document.createElement('input');
        volume.type = 'range';
        volume.className = 'volume-range';

        const scrubBar = document.createElement('input');
        scrubBar.type = 'range';
        scrubBar.className = 'scrub-bar';

        // update scrub bar position as video plays
        scrubBar.addEventListener('change', () => {
            // Calculate the new time
            const time = video.duration * (parseInt(scrubBar.value, 10) / 100);

            // Update the video time
            video.currentTime = time;
        });

        // allow clicking the scrub bar to seek to a video position
        function seek(e: MouseEvent) {
            const percent = e.offsetX / this.offsetWidth;
            video.currentTime = percent * video.duration;
        }

        scrubBar.addEventListener('click', seek);

        // Update the seek bar as the video plays
        video.addEventListener('timeupdate', () => {
            // Calculate the slider value
            const value = (100 / video.duration) * video.currentTime;

            // Update the slider value
            scrubBar.value = value.toString();
        });

        // Pause the video when the slider handle is being dragged
        scrubBar.addEventListener('mousedown', () => {
            pauseVideo();
        });

        // Play the video when the slider handle is dropped
        scrubBar.addEventListener('mouseup', () => {
            playVideo();
        });

        // container to hold all controls
        const controls = document.createElement('div');
        controls.className = 'video-controls';

        controls.appendChild(playPause);
        controls.appendChild(volume);
        controls.appendChild(mute);
        controls.appendChild(fullscreen);
        this._target.appendChild(scrubBar);
        this._target.appendChild(controls);
    }

    videoContextExperiment() {
        this._canvas = document.createElement('canvas');
        const canvas = this._canvas;
        const videoCtx = new CustomVideoContext(canvas);

        // const videoNode1 = videoCtx.video('./video1.mp4');
        const videoNode1 = videoCtx.hls('https://vod-hls-uk-stage.akamaized.net/usp/auth/vod/piff_abr_full_sd/878e62-p01fqwrm/vf_p01fqwrm_22f3fd45-7ad6-474a-8fc7-c56a1d957316.ism/mobile_wifi_main_sd_abr_v2_hls_master.m3u8?__gda__=1515534492_a7badb49b42715342a9b418cf0e1489c', 0, 4);
        videoNode1.start(0);
        // videoNode1.stop(4);

        // const videoNode2 = videoCtx.video('./video2.mp4');
        // videoNode2.start(2);
        // videoNode2.stop(6);

        // const crossFade = videoCtx.transition(VideoContext.DEFINITIONS.CROSSFADE);
        // crossFade.transition(2, 4, 0.0, 1.0, 'mix');

        // videoNode1.connect(crossFade);
        // videoNode2.connect(crossFade);
        videoNode1.connect(videoCtx.destination);
        videoCtx.play();
        this._target.appendChild(canvas);
    }

    renderDataModelInfo() {
        const assetList = document.createElement('ul');
        const foregroundItem = document.createElement('li');
        const backgroundItem = document.createElement('li');
        const iconItem = document.createElement('li');
        assetList.appendChild(foregroundItem);
        assetList.appendChild(backgroundItem);
        assetList.appendChild(iconItem);
        this._target.appendChild(assetList);

        if (this._representation.asset_collection.foreground) {
            this._fetchAssetCollection(this._representation.asset_collection.foreground).then((fg) => {
                foregroundItem.textContent = `foreground: ${fg.name}`;
                if (fg.assets.av_src) {
                    foregroundItem.textContent += ` from ${fg.assets.av_src}`;
                }
            });
        }

        if (
            this._representation.asset_collection.background &&
            this._representation.asset_collection.background.length > 0
        ) {
            this._fetchAssetCollection(this._representation.asset_collection.background[0]).then((bg) => {
                backgroundItem.textContent = `background: ${bg.name}`;
                if (bg.assets.audio_src) {
                    backgroundItem.textContent += ` from ${bg.assets.audio_src}`;
                }
            });
        } else {
            backgroundItem.textContent = 'background: none';
        }

        if (this._representation.asset_collection.icon) {
            this._fetchAssetCollection(this._representation.asset_collection.icon.default).then((icon) => {
                iconItem.textContent = `icon: ${icon.name}`;
                if (icon.assets.image_src) {
                    iconItem.textContent += ` from ${icon.assets.image_src}`;
                }
            });
        } else {
            iconItem.textContent = 'icon: none';
        }
    }

    getCurrentTime(): number {
        return this._videoElement.currentTime;
    }

    setCurrentTime(time: number) {
        this._videoElement.currentTime = time;
    }

    setStartTime(time: number) {
        this._videoElement.addEventListener('loadeddata', () => {
            this.setCurrentTime(time);
        });
    }

    destroy() {
        while (this._target.lastChild) {
            this._target.removeChild(this._target.lastChild);
        }
        super.destroy();
    }
}
