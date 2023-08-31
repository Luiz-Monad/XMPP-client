
declare module 'templates' {
    namespace includes {
        function bareMessage(locals: any): string;
        function call(): string;
        function contactListItem(locals: any): string;
        function contactListItemResource(locals: any): string;
        function contactRequest(): string;
        function dayDivider(locals: any): string;
        function embeds(locals: any): string;
        function message(locals: any): string;
        function messageGroup(): string;
        function mucBareMessage(locals: any): string;
        function mucListItem(locals: any): string;
        function mucRosterItem(): string;
        function mucWrappedMessage(locals: any): string;
        function wrappedMessage(locals: any): string;
    }

    namespace pages {
        function chat(): string;
        function groupchat(): string;
        function settings(): string;
        function signin(): string;
    }
    
    namespace misc {
        function growlMessage(locals: any): string;
    }

    function body(): string;
    function head(): string;
}
