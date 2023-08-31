
declare module 'parselinks' {

    /**
     * Parses URLs, email addresses, and possibly other types of links from a given string.
     * @param input The string to parse links from.
     * @param config Optional configuration object.
     * @returns A string with parsed links.
     */
    export default function (input: string, config?: {
        callback?: (displayText: string, href?: string) => string | void;
        punct_regexp?: RegExp;
    }): string;

}
