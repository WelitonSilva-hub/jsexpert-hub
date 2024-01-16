import MP4Demuxer from './mp4Demuxer.js';
import VideoProcessor from './videoProcessor.js';
import CanvasRenderer from './canvasRenderer.js';

const mp4Demuxer = new MP4Demuxer();
const videoProcessor = new VideoProcessor({ mp4Demuxer: mp4Demuxer });

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
    // hardwareAcceleration: 'prefer-hardawre',
    // avc: { format: 'annexb' },
};

onmessage = async ({ data }) => {
    await videoProcessor.start({
        file: data.file,
        renderFrame: new CanvasRenderer(data.canvas).getRenderer(),
        encoderConfig: encoderConfig,
        sendMessage(message) {
            self.postMessage(message);
        },
    });

    self.postMessage({ status: 'done' });
};
