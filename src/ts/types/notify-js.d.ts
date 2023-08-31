
declare module 'notify.js' {

    type NotificationOptions = {
        icon?: string;
        dir?: 'auto';
        lang?: string;
        body?: string;
        tag?: string;
        [key: string]: any; // to allow for possible other properties
    };

    type FallbackOptions = {
        permission?: 'default' | 'denied' | 'granted';
        requestPermission?: (cb: (perm: 'default' | 'denied' | 'granted') => void) => void;
        create?: (title: string, opts: NotificationOptions) => void;
    };

    class Notifications {
        permission: string;
        opts: NotificationOptions;
        fallback: FallbackOptions;

        constructor(opts?: NotificationOptions, fallback?: FallbackOptions);

        create(title: string, opts?: NotificationOptions): void;
        permissionNeeded(): boolean;
        allowed(): boolean;
        requestPermission(cb: (perm: 'default' | 'denied' | 'granted') => void): void;
    }

    export = Notifications; 
}
