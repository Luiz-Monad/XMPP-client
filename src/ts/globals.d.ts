import { App } from './app';
import { MeType } from './models/me';
import StanzaIO from 'stanza';

declare global {
    type ClientType = StanzaIO.Agent;    

    declare let SERVER_CONFIG: any;
    declare let client: ClientType;
    declare let app: App;
    declare let me: MeType;
    
    interface Window {
        SERVER_CONFIG: any;
        client: ClientType;
        app: App;
        me: MeType;
    }

}

export {}
