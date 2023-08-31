
declare module 'localmedia' {
    export = LocalMedia;

    class LocalMedia {
        constructor(opts?: LocalMediaOptions);

        config: LocalMediaConfig;
        localStreams: MediaStream[];
        localScreens: MediaStream[];

        start(mediaConstraints?: MediaStreamConstraints, cb?: (err: any, stream?: MediaStream) => void): void;
        stop(stream?: MediaStream): void;
        stopStream(stream?: MediaStream): void;
        startScreenShare(constraints?: MediaStreamConstraints, cb?: (err: any, stream?: MediaStream) => void): void;
        stopScreenShare(stream?: MediaStream): void;

        mute(): void;
        unmute(): void;
        pauseVideo(): void;
        resumeVideo(): void;
        pause(): void;
        resume(): void;
        _audioEnabled(bool: boolean): void;
        _videoEnabled(bool: boolean): void;

        isAudioEnabled(): boolean;
        isVideoEnabled(): boolean;

        _removeStream(stream: MediaStream): void;
        _setupAudioMonitor(stream: MediaStream, harkOptions?: any): void;
        _stopAudioMonitor(stream: MediaStream): void;

        on(event: string, listener: (...args: any[]) => void): void;
        emit(event: string, ...args: any[]): void;
    }

    interface LocalMediaOptions {
        detectSpeakingEvents?: boolean;
        audioFallback?: boolean;
        media?: MediaStreamConstraints;
        harkOptions?: any;
        logger?: typeof console;
    }

    interface LocalMediaConfig extends LocalMediaOptions {
        logger: typeof console;
    }
}
