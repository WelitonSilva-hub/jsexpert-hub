import MP4Demuxer from './mp4Demuxer.js';
import VideoProcessor from './videoProcessor.js';
import CanvasRenderer from './canvasRenderer.js';
import WebMWritter from '../deps/webm-writer2.js';
import Service from './service.js';

const qvgaConstraints = { width: 320, height: 240 };
const vgaConstraints = { width: 640, height: 480 };
const hdConstraints = { width: 1280, height: 720 };

const encoderConfig = {
    ...qvgaConstraints,
    bitrate: 10e6,
    // WebM
    codec: 'vp09.00.10.08',
    pt: 4,
    hardwareAcceleration: 'prefer-software',
    // MP4
    // codec: 'avc1.42002A',
    // pt: 1,
    // hardwareAcceleration: 'prefer-hardware',
    // avc: { format: 'annexb' },
};

const webMWritterConfig = {
    codec: 'VP9',
    width: encoderConfig.width,
    height: encoderConfig.height,
    bitrate: encoderConfig.bitrate,
};

const mp4Demuxer = new MP4Demuxer();
const webMWritter = new WebMWritter(webMWritterConfig);
const service = new Service({ url: 'http://10.200.177.4:3000' });
const videoProcessor = new VideoProcessor({ mp4Demuxer, webMWritter, service });

onmessage = async ({ data }) => {
    await videoProcessor.start({
        file: data.file,
        renderFrame: new CanvasRenderer(data.canvas).getRenderer(),
        encoderConfig: encoderConfig,
        sendMessage: (message) => {
            self.postMessage(message);
        },
    });

    // self.postMessage({ status: 'done' });
};
