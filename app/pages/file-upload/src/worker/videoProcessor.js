export default class VideoProcessor {
    #mp4Demuxer;
    #webMWritter;
    #buffers = [];

    /**
     * @param {object} options
     * @param {import('./mp4Demuxer.js').default} options.mp4Demuxer
     * @param {import('../deps/webm-writer2.js').default} options.webMWritter
     */
    constructor({ mp4Demuxer, webMWritter }) {
        this.#mp4Demuxer = mp4Demuxer;
        this.#webMWritter = webMWritter;
    }

    /** @returns {ReadableStream} */
    mp4Decoder(stream) {
        return new ReadableStream({
            start: async (controller) => {
                const decoder = new VideoDecoder({
                    /** @param {VideoFrame} frame */
                    output(frame) {
                        controller.enqueue(frame);
                    },
                    error(e) {
                        console.log('error at mp4Decoder.', e);
                        controller.error(e);
                    },
                });

                return this.#mp4Demuxer.run(stream, {
                    async onConfig(config) {
                        const { supported } = await VideoDecoder.isConfigSupported(config);

                        if (!supported) {
                            console.log('mp4Muxer VideoDecoder config not supported', config);
                            controller.close();
                            return;
                        }

                        decoder.configure(config);
                    },
                    /** @param {EncodedVideoChunk} chunk */
                    onChunk(chunk) {
                        decoder.decode(chunk);
                    },
                });
                // .then(() => {
                //     setTimeout(() => {
                //         controller.close();
                //     }, 2000);
                // });
            },
        });
    }

    encode144p(encoderConfig) {
        let _encoder;

        const readable = new ReadableStream({
            start: async (controller) => {
                const { supported } = await VideoEncoder.isConfigSupported(encoderConfig);

                if (!supported) {
                    console.log('mp4Muxer VideoEncoder config not supported', encoderConfig);
                    controller.error('mp4Muxer VideoEncoder config not supported');
                    return;
                }

                _encoder = new VideoEncoder({
                    /**
                     * @param {EncodedVideoChunk} frame
                     * @param {EncodedVideoChunkMetadata} config
                     */
                    output: (frame, config) => {
                        if (config.decoderConfig) {
                            const decoderConfig = {
                                type: 'config',
                                config: config.decoderConfig,
                            };

                            controller.enqueue(decoderConfig);
                        }

                        controller.enqueue(frame);
                    },
                    error: (e) => {
                        console.error('VideoEncoder 144p', e);
                        controller.error(e);
                    },
                });

                _encoder.configure(encoderConfig);
            },
        });

        const writable = new WritableStream({
            async write(frame) {
                _encoder.encode(frame);
                frame.close();
            },
        });

        return { readable, writable };
    }

    renderEncodedFramesAndGetEncodedChunks(renderFrame) {
        let _decoder;

        return new TransformStream({
            start(controller) {
                _decoder = new VideoDecoder({
                    output(frame) {
                        renderFrame(frame);
                    },
                    error(e) {
                        console.log('error at renderFrames', e);
                        controller.error(e);
                    },
                });
            },
            /**
             * @param {EncodedVideoChunk} encodedChunk
             * @param {TransformStreamDefaultController} controller
             */
            async transform(encodedChunk, controller) {
                if (encodedChunk.type == 'config') {
                    await _decoder.configure(encodedChunk.config);
                    return;
                }

                _decoder.decode(encodedChunk);

                // Need the encoded version to use webM
                controller.enqueue(encodedChunk);
            },
        });
    }

    transformIntoWebM() {
        const writable = new WritableStream({
            write: (chunk) => {
                this.#webMWritter.addFrame(chunk);
            },
            close() {
                debugger;
            },
        });

        return { readable: this.#webMWritter.getStream(), writable: writable };
    }

    async start({ file, encoderConfig, renderFrame, sendMessage }) {
        const stream = file.stream();
        const filename = file.name.split('/').pop().replace('.mp4', '');

        await this.mp4Decoder(stream)
            .pipeThrough(this.encode144p(encoderConfig))
            .pipeThrough(this.renderEncodedFramesAndGetEncodedChunks(renderFrame))
            .pipeThrough(this.transformIntoWebM())
            // Usado para debug, baixa uma versão do vídeo no pc
            // .pipeThrough(
            //     new TransformStream({
            //         transform: ({ data, position }, controller) => {
            //             this.#buffers.push(data);
            //             controller.enqueue(data);
            //         },
            //         flush: () => {
            //             // sendMessage({
            //             //     status: 'done',
            //             //     buffers: this.#buffers,
            //             //     filename: filename.concat('-144p.webm'),
            //             // });
            //             sendMessage({
            //                 status: 'done',
            //                 filename: filename.concat('-144p.webm'),
            //             });
            //         },
            //     })
            // )
            .pipeTo(
                new WritableStream({
                    write(frame) {},
                })
            );
    }
}
