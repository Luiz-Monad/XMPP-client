
declare module 'getusermedia' {
    // Define the constraints type
    interface Constraints {
        video?: boolean;
        audio?: boolean;
    }

    // Define the callback type
    type Callback = (error: MediaStreamError | null, stream?: MediaStream) => void;

    // Define the MediaStreamError type
    class MediaStreamError extends Error {
        name: 'NotSupportedError' | 'NoMediaRequestedError' | 'PermissionDeniedError' | 'ConstraintNotSatisfiedError';
    }

    // Export the main function
    function getUserMedia(constraints: Constraints, cb: Callback): void;
    function getUserMedia(cb: Callback): void; // Overload for optional constraints

    export = getUserMedia;
}
