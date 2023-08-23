
// get a property that's a function or direct property
export default function (obj: Record<string, any>, propName: string) {
    if (obj[propName] instanceof Function) {
        return obj[propName]();
    } else {
        return obj[propName] || '';
    }
};
