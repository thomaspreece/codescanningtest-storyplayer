// @flow

import Hls from 'hls.js';
import { checkDebugPlayout, getOverrideFormat, fetchOverridePlayout } from './utils';
import logger from './logger';

export const PLAYOUT_ENGINES = {
    SRC_SWITCH_PLAYOUT: 'src',
    DOM_SWITCH_PLAYOUT: 'dom',
    IOS_PLAYOUT: 'ios',
};

export class BrowserUserAgent {
    static iOS() {
        const iDevices = [
            'iPad Simulator',
            'iPhone Simulator',
            'iPod Simulator',
            'iPad',
            'iPhone',
            'iPod',
        ];

        if (navigator.platform) {
            while (iDevices.length) {
                if (navigator.platform === iDevices.pop()) {
                    return true;
                }
            }
        }

        return false;
    }

    static iPhone() {
        const iDevices = ['iPhone Simulator', 'iPod Simulator', 'iPhone', 'iPod'];
        if (navigator.platform) {
            while (iDevices.length) {
                if (navigator.platform === iDevices.pop()) {
                    return true;
                }
            }
        }
        return false;
    }

    static safari() {
        const ua = window.navigator.userAgent;
        const macOS = 'MacIntel';
        if (navigator.platform && navigator.platform === macOS) {
            // it is a mac running safari not running chrome
            return ua.indexOf('Macintosh') > -1 &&
            ua.indexOf('Safari') > -1 &&
            ua.indexOf('Chrome') < 0;
        }
        if(this.iOS()) {
            return ua.indexOf('Safari') > 0;
        }
        return false;
    }

    static isSafariDesktop() {
        const safariCheck = (!window.safari ||
            (typeof safari !== 'undefined' && window.safari.pushNotification));

        // fallback to user agent sniffing if we can't detect safari using this method
        return safariCheck.toString() === "[object SafariRemoteNotification]"
    }

    static ie() {
        const ua = window.navigator.userAgent;

        const msie = ua.indexOf('MSIE ');
        if (msie > 0) {
            // IE 10 or older => return version number
            return parseInt(
                ua.substring(msie + 5, ua.indexOf('.', msie)),
                10,
            );
        }

        const trident = ua.indexOf('Trident/');
        if (trident > 0) {
            const rv = ua.indexOf('rv:');
            return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
        }

        // other browser
        return false;
    }

    static edge() {
        const ua = window.navigator.userAgent;

        const edge = ua.indexOf('Edge/');
        if (edge > 0) {
            // Edge (IE 12+) => return version number
            return parseInt(
                ua.substring(edge + 5, ua.indexOf('.', edge)),
                10,
            );
        }

        // other browser
        return false;
    }
}

export class BrowserCapabilities {
    static hlsSupported: boolean

    static dashSupported: boolean

    static hlsJsSupport() {
        return Hls.isSupported();
    }

    static hlsSupport() {
        if (BrowserCapabilities.hlsSupported !== undefined) {
            return BrowserCapabilities.hlsSupported;
        }
        // HLS doesn't seem to work on IE or Edge :(
        if (BrowserUserAgent.edge() || BrowserUserAgent.ie()) {
            BrowserCapabilities.hlsSupported = false;
            return false;
        }
        if (BrowserCapabilities.hlsJsSupport()) {
            BrowserCapabilities.hlsSupported = true;
            return true;
        }
        const video = document.createElement('video');
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            BrowserCapabilities.hlsSupported = true;
            return true;
        }
        BrowserCapabilities.hlsSupported = false;
        return false;
    }

    static dashSupport() {
        if (BrowserCapabilities.dashSupported !== undefined) {
            return BrowserCapabilities.dashSupported;
        }
        // Copied from https://github.com/Dash-Industry-Forum/dash.js/issues/2055
        // No official dashjs is supported function
        if (typeof (window.MediaSource || window.WebKitMediaSource) === 'function') {
            BrowserCapabilities.dashSupported = true;
            return true;
        }
        BrowserCapabilities.dashSupported = false;
        return false;
    }

}

export class MediaFormats {

    static getFormat() {
        const overrideFormat = getOverrideFormat();
        const debugPlayout = checkDebugPlayout();
        if(overrideFormat) {
            logger.info(`Overriding media selector format: , ${overrideFormat}`)
            return overrideFormat;
        }

        // desktop safari supports dash
        if(BrowserUserAgent.isSafariDesktop()) {
            if (debugPlayout) {
                logger.info("getFormat: isSafariDesktop = True")
            }
            return 'dash'
        }
        // iOS uses hls
        if (BrowserUserAgent.safari() && BrowserCapabilities.hlsSupport()) {
            if (debugPlayout) {
                logger.info("getFormat: safari = True")
            }
            return 'hls';
        }
        // otherwise we check for explicit hls or dash support
        if (BrowserCapabilities.dashSupport()) {
            if (debugPlayout) {
                logger.info("getFormat: Dash Support = True")
            }
            return 'dash';
        }
        if (BrowserCapabilities.hlsSupport()) {
            if (debugPlayout) {
                logger.info("getFormat: HLS Support = True")
            }
            return 'hls';
        }
        // if we can't support anything we return null
        return null;
    }

    static getPlayoutEngine() {
        const overridePlayout = fetchOverridePlayout();
        const debugPlayout = checkDebugPlayout();
        if(overridePlayout && Object.values(PLAYOUT_ENGINES).includes(overridePlayout)) {
            logger.info("Overriding playout engine: ", overridePlayout);
            if(overridePlayout === 'src') {
                logger.warn('Cannot use source engine');
                return 'ios';
            }
            return overridePlayout
        }
        if(BrowserCapabilities.dashSupport()) {
            if(BrowserUserAgent.isSafariDesktop()) {
                // Safari Desktop
                if (debugPlayout) {
                    logger.info("getPlayoutEngine: DashSupport + isSafariDesktop = True")
                }
                return 'dom';
            }
            if (BrowserUserAgent.safari()) {
                // Safari iOS
                if (debugPlayout) {
                    logger.info("getPlayoutEngine: DashSupport + safari = True")
                }
                return 'ios';
            }
            if (debugPlayout) {
                logger.info("getPlayoutEngine: DashSupport + not safari = True")
            }
            return 'dom';
        }
        if(BrowserCapabilities.hlsSupport()) {
            // Safari Mobile
            if (debugPlayout) {
                logger.info("getPlayoutEngine: HlsSupport = True")
            }
            return 'ios';
        }

        if (debugPlayout) {
            logger.info("getPlayoutEngine: No DashSupport or HlsSupport")
        }
        // default?
        return 'dom';
    }
}
