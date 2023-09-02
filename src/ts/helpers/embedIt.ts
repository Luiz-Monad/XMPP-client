
import 'jquery_oembed';

export default function ($html: JQuery, cb?: () => void) {
    cb = cb || function () { };

    ($($html).find("a.source") as any).oembed(null, {
        fallback: false,
        includeHandle: false,
        maxWidth: 500,
        maxHeight: 350,
        afterEmbed: function (container: unknown, oembedData: unknown) {
            this.parent().parent().parent().show();
        },
        onProviderNotFound: function () {
            const link = $($html).find('a.source');
            const resourceURL = link.attr('href');
            if (resourceURL && resourceURL.match(/\.(jpg|png|gif)\b/)) {
                link.parent().append("<div class='oembedall-container'><a href='" + resourceURL + "' target='_blank'><img src='" + resourceURL + "' / style='max-width:500px; max-height:350px; width: auto; height: auto;'></a></div>");
                this.parent().parent().show();
            }
        }
    });
};
