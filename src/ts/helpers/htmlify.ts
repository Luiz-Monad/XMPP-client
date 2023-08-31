
import _ from 'underscore';
import parseLinks from 'parselinks';

export default {
    toHTML: function (msg: string, team?: unknown) {
        const html = this.escapeHTML(msg);
        return this.linkify(html);
    },
    linkify: function (text: string) {
        return parseLinks(text, {
            callback: function (text: string, href?: string) {
                return href ? '<a href="' + href + '" target="_blank">' + text + '</a>' : text;
            }
        }) as string;
    },
    collectLinks: function (text: string) {
        const links: string[] = [];
        parseLinks(text, {
            callback: function (text: string, href?: string) {
                if (!href) return;
                links.push(href);
            }
        });
        return links;
    },
    escapeHTML: function (s: string) {
        const re = /[&\"'<>]/g,  // "
            map = { "&": "&amp;", "\"": "&quot;", "'": "&apos;", "<": "&lt;", ">": "&gt;" };
        type kmap = keyof typeof map
        return s.replace(re, function (c: string) { return map[c as kmap]; });
    },
};
