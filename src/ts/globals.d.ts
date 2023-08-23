import { App } from './app'

declare global {

    declare let SERVER_CONFIG: any;
    declare let client: any;
    declare let me: any;
    declare let app: App;
    
    interface Window {
        SERVER_CONFIG: any;
        client: any;
        app: any;
        me: any;
    }

}

export {}
