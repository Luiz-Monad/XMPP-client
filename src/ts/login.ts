import StanzaIO, { TransportConfig } from 'stanza';

if (localStorage.authFailed) {
    document.getElementById('auth-failed')!.style.display = 'block';
    localStorage.removeItem('authFailed');
}

document.getElementById('login-form')!.addEventListener('submit', function (e) {
    function value(id: string) {
        const el = document.getElementById(id);
        return el && 'value' in el ? el.value as string : '';
    }
    function checked(id: string) {
        const el = document.getElementById(id);
        return el && 'checked' in el ? el.checked as string : '';
    }

    let jid = value('jid');
    if (SERVER_CONFIG.domain && jid.indexOf('@') == -1)
        jid += "@" + SERVER_CONFIG.domain;
    const password = value('password');
    const connURL = SERVER_CONFIG.wss ? SERVER_CONFIG.wss : value('connURL');
    const publicComputer = checked('public-computer');

    let transport: { [key: string]: TransportConfig };
    if (connURL.indexOf('http') === 0) {
        transport = {
            bosh: {
                jid: jid,
                server: connURL,
            }
        };
    } else if (connURL.indexOf('ws') === 0) {
        transport = {
            websocket: {
                jid: jid,
                server: connURL,
            }
        };
    } else {
        transport = {};
    }

    const softwareVersion = SERVER_CONFIG.softwareVersion;
    if (softwareVersion) {
        softwareVersion.os = navigator.userAgent
    }

    const config: StanzaIO.AgentConfig = {
        server: jid.slice(jid.indexOf('@') + 1),
        transports: transport,
        credentials: {
            password: password
        },
        //TODO:: saveCredentials: !publicComputer, 
        softwareVersion: softwareVersion
    };
    localStorage.config = JSON.stringify(config);

    window.location.href = './';

    e.preventDefault();
});
