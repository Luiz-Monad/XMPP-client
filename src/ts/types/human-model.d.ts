
declare module 'human-model' {
    export interface IModelDefinition<Props, Session, Derived, Collections, Methods> {
        props?: Record<keyof Props, any>;
        session?: Record<keyof Session, any>;
        derived?: Record<keyof Derived, any>;
        collections?: Record<keyof Collections, any>;
        type: string;
    };

    export interface IRegistry {
        _cache: Record<string, any>;
        _namespaces: Record<string, any>;
        _getCache(ns?: string): Record<string, any>;
        lookup(type: string, id: string | number, ns?: string): any;
        store(model: IHumanModel): this;
        remove(type: string, id: string | number, ns?: string): boolean;
        clear(): void;
    }

    export interface IHumanModel<Props, Session, Derived, Collections, Methods> extends Backbone.Events, Props, Session, Derived, Collections, Methods {
        getId(): string | number;
        initialize(): this;
        parse(resp: any, options: any): any;
        serialize(): any;
        remove(): this;
        set(key: string | Record<string, any>, value?: any, options?: any): this;
        get(attr: string): any;
        toggle(property: string): this;
        previousAttributes(): Record<string, any>;
        save(key?: string | Record<string, any>, val?: any, options?: any): any;
        fetch(options?: any): any;
        destroy(options?: any): any;
        hasChanged(attr?: string): boolean;
        changedAttributes(diff?: any): Record<string, any> | false;
        toJSON(): any;
        has(attr: string): boolean;
        url(): string;
        isNew(): boolean;
        clone(): this;
        isValid(options?: any): boolean;
        escape(attr: string): string;
        sync(): any;
        unset(attr: string, options?: any): this;
        clear(options?: any): this;
        addListVal(prop: string, value: any, prepend?: boolean): this;
        previous(attr: string): any;
        removeListVal(prop: string, value: any): this;
        hasListVal(prop: string, value: any): boolean;

        // Properties
        idAttribute: string;
        extraProperties: 'ignore' | 'reject' | 'allow';
        attributes: Record<string, any>;
        json: string;
        toTemplate: Record<string, any>;
        props?: Record<keyof Props, any>;
        session?: Record<keyof Session, any>;
        derived?: Record<keyof Derived, any>;
        derivedProps?: Record<keyof Derived, any>;
        collections?: Record<keyof Collections, any>;
        registry: IRegistry;
    }

    export interface IDataTypes {
        [key: string]: {
            set?: (newVal: any) => { val: any, type: string };
            get?: (val: any) => any;
        };
    }

    export function define<Props, Session, Derived, Collections, Methods>(spec: IModelDefinition<Props, Session, Derived, Collections, Methods> & Methods): new () => IHumanModel<Props, Session, Derived, Collections, Methods>;

    export const registry: IRegistry;
    export const Registry: IRegistry;
    export const dataTypes: IDataTypes;
}
