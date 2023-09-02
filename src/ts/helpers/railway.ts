
type TryResult<T> = [any, T?];

export async function rail<T>(promise: Promise<T>): Promise<TryResult<T>> {
    try {
        const result = await promise;
        return [null, result];
    } catch (err: any) {
        return [err];
    }
}

export function fire<T>(input: (() => Promise<T>) | Promise<T>) {
    const promise = typeof input === 'function' ? input() : input;
    promise.catch(err => {
        console.error('UNCAUGHT: ', err);
    });
}

export function timer(onFire: (() => Promise<void>), intervalMs: number) {
    function getInterval() {
        if (!client.sessionStarted) return;
        fire(onFire);
        setTimeout(getInterval, intervalMs);
    }
    getInterval();
}
