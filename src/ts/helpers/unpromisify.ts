
type PromiseFunction = (...args: any[]) => Promise<any>;
type PromiseReturn<T extends PromiseFunction> = ReturnType<T> extends Promise<infer U> ? U : never;

type Unpromisify<T extends (...args: any[]) => Promise<any>> = (
    ...args: [...Parameters<T>, (error: any, result: PromiseReturn<T>) => void]
) => void;

export default function unpromisify<F extends PromiseFunction>(fn: F) {
    return fn as unknown as Unpromisify<F>;
}
