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

    const domain = SERVER_CONFIG.domain ?? '';
    const jid = value('jid');
    const parts = jid.split('@');
    const user = parts[0];
    const server = parts.indexOf('@') == -1 ? domain : parts[1];
    const password = value('password');
    const connURL = SERVER_CONFIG.wss ? SERVER_CONFIG.wss : value('connURL');
    const publicComputer = checked('public-computer');

    let transport: StanzaIO.AgentConfig['transports'];
    if (connURL.indexOf('http') === 0) {
        transport = {
            bosh: connURL
        };
    } else if (connURL.indexOf('ws') === 0) {
        transport = {
            websocket: connURL
        };
    } else {
        transport = {};
    }

    const softwareVersion = SERVER_CONFIG.softwareVersion;
    if (softwareVersion) {
        softwareVersion.os = navigator.userAgent
    }

    const config: StanzaIO.AgentConfig = {
        jid: jid,
        server: server,
        transports: transport,
        credentials: {
            username: user,
            password: password,
        },
        //TODO:: saveCredentials: !publicComputer, 
        softwareVersion: softwareVersion
    };
    localStorage.config = JSON.stringify(config);

    window.location.href = './';

    e.preventDefault();
});
