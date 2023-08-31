import { App } from './app';
import { MeType } from './models/me';
import StanzaIO from 'stanza';
import { SoftwareVersion } from 'stanza/protocol';

type ServerConfig = {
    name?: string;
    softwareVersion?: SoftwareVersion;
    baseUrl?: string;
    startup?: string;
    gravatar?: boolean;
    securePasswordStorage?: boolean;
    keepalive?: KeepAliveOptions;
    wss?: string;
    domain?: string;
    admin?: string;
    muc?: string;
}

declare global {
    type ClientType = StanzaIO.Agent;

    declare let SERVER_CONFIG: ServerConfig;
    declare let client: ClientType;
    declare let app: App;
    declare let me: MeType;

    interface Window {
        SERVER_CONFIG: ServerConfig;
        client: ClientType;
        app: App;
        me: MeType;
    }

    interface Storage {
        config?: string;
        authFailed?: boolean;
    }
}

export { }
