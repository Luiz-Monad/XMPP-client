import { Agent, Client, JXT } from "stanza";
import unpromisify from "./unpromisify";

type Cb = () => void;

declare module 'stanza' {

    export interface Agent {
        registerPushService(jid: string, cb: Cb): void;
        getPushServices(cb: Cb): void;
        unregisterPushService(jid: string, cb: Cb): void;
        otalkRegister(deviceID: string, cb: Cb): void;
    }

    export interface AgentEvents {
        // mystanza: Message & { mystanza: MyStanza };
    }

    export interface RegisterPush {
        service: string
    }

    export interface UnregisterPush {
        service: string
    }

    export interface OtalkRegister {
        deviceID: string
    }

    namespace Stanzas {

        export interface Message {
            registerPush?: RegisterPush;
            unregisterPush?: UnregisterPush;
            otalkRegister?: OtalkRegister;
        }
    }
}


export default function (client: Agent, registry: JXT.Registry) {

    registry.define({
        path: 'message.pushNotification',
        namespace: 'urn:xmpp:push:0',
        element: 'push',
        fields: {
            body: JXT.childText('urn:xmpp:push:0', 'body')
        }
    });

    registry.define({
        path: 'message.registerPush',
        namespace: 'urn:xmpp:push:0',
        element: 'register',
        fields: {
            service: JXT.text()
        }
    });

    registry.define({
        path: 'message.unregisterPush',
        namespace: 'urn:xmpp:push:0',
        element: 'unregister',
        fields: {
            service: JXT.text()
        }
    });

    registry.define({
        path: 'message.otalkRegister',
        namespace: 'http://otalk.im/protocol/push',
        element: 'register',
        fields: {
            deviceID: JXT.text()
        }
    });

    client.registerPushService = function (jid, cb) {
        client.sendMessage({
            registerPush: {
                service: jid
            }
        });
        return cb();
    };

    client.getPushServices = function (cb) {
        return unpromisify(client.getDiscoItems)('', 'urn:xmpp:push', cb);
    };

    client.unregisterPushService = function (jid, cb) {
        client.sendMessage({
            unregisterPush: {
                service: jid
            }
        });
        return cb();
    };

    client.otalkRegister = function (deviceID, cb) {
        client.sendMessage({
            to: 'push@push.otalk.im/prod',
            otalkRegister: {
                deviceID: deviceID
            }
        });
        return cb();
    };
};
