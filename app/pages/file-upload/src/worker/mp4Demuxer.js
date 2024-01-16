import { createFile } from '../deps/mp4box.0.5.2.js';

export default class MP4Demuxer {
    #onConfig;
    #onChunk;
    #file;

    /**
     * @param {ReadableStream} stream
     * @param {object} options
     * @param {(config: object) => void} options.onConfig
     *
     * @returns {Promise<void>}
     */
    async run(stream, { onConfig, onChunk }) {
        this.#onConfig = onConfig;
        this.#onChunk = onChunk;

        this.#file = createFile();
        this.#file.onReady = this.#onReady.bind(this);
        this.#file.onSamples = this.#onSamples.bind(this);

        this.#file.onError = (error) => console.log('Deu ruim...');
        return this.#init(stream);
    }

    /**
     * @param {ReadableStream} stream
     * @returns {Promise<void>}
     */
    #init(stream) {
        let _offset = 0;

        const consumerFile = new WritableStream({
            /** @param {Uint8Array} chunk */
            write: (chunk) => {
                const buffer = chunk.buffer;
                buffer.fileStart = _offset;
                this.#file.appendBuffer(buffer);

                _offset += chunk.length;
            },
            close: () => {
                this.#file.flush();
            },
        });

        return stream.pipeTo(consumerFile);
    }

    #onReady(info) {
        const [track] = info.videoTracks;

        this.#onConfig({ track });

        this.#file.setExtractionOptions(track.id);
        this.#file.start();
    }

    #onSamples(trackId, ref, samples) {
        debugger;
    }
}
