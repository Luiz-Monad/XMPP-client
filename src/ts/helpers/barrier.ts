
export default class Barrier {
    private events: Map<string, (() => void)[]> = new Map();

    // Register a listener for the signal.
    listen(event: string): Promise<void> {
        return new Promise((resolve) => {
            if (!this.events.has(event)) {
                this.events.set(event, []);
            }
            this.events.get(event)!.push(resolve);
        });
    }

    // Trigger the signal. This will resolve all promises registered to the event.
    trigger(event: string): void {
        this.events.get(event)?.forEach((resolve) => resolve());
        this.events.set(event, []);
    }
}
