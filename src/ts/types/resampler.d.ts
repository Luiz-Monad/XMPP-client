
declare module 'resampler' {

    type OnResample = (dataURL: string) => void;

    export default function (img: string, width: number, height: number, onresample: OnResample): void;

}
