
import { ParsedJID, parse } from 'stanza/JID';

export class JID implements ParsedJID {
    bare: string;
    domain: string;
    full: string;
    local?: string;
    resource?: string;
    unescapedFull?: string;
    prepped?: string;

    constructor(bare: string, domain: string, full: string) {
        this.bare = bare;
        this.domain = domain;
        this.full = full;
    }

    static parse(jid: string): JID {
        return parse(jid);
    }
}
