
// from sugar-date, typings aren't working properly.

declare global {
    interface DateConstructor {
        create(ticks: string | number | Date): Date;
    }

    interface Date {
        format(fmt: string): string
    }
}

export { }
