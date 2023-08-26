
declare module 'human-model' {
    import { _StringKey, Collection } from 'backbone';

    export type Attributes = Record<string, any>;

    export type Options = Record<string, any>;

    type PropTypeMapping = {
        'string': string;
        'array': object[];
        'bool': boolean;
        'boolean': boolean;
        'date': Date;
        'number': number;
        'object': object;
    };

    type ValidPropSimple =
        keyof PropTypeMapping;

    type ModelPropSimple<T> =
        T extends keyof PropTypeMapping ? PropTypeMapping<T> :
        never;

    type ValidPropTuple =
        [keyof PropTypeMapping, boolean?, any?];

    type ModelPropTuple<T> =
        T extends [infer L, true, any?] ? PropTypeMapping[L] :
        T extends [infer L, false, any?] ? PropTypeMapping[L] | undefined :
        never;

    type ModelPropExtra = {
        default?: any;
        allowNull?: boolean;
        setOnce?: boolean;
        test?: Function;
        values?: any[];
    };

    type ValidPropObject =
        { type: keyof PropTypeMapping, required?: boolean } & ModelPropExtra;

    type ModelPropObject<T> =
        T extends { type: infer L, required: true } & ModelPropExtra ? PropTypeMapping[L] :
        T extends { type: infer L, required?: false } & ModelPropExtra ? PropTypeMapping[L] | undefined :
        never;

    type ValidProp =
        ValidPropSimple |
        ValidPropTuple |
        ValidPropObject;

    type ModelProp<T> =
        T extends ValidPropSimple ? ModelPropSimple<T> :
        T extends ValidPropTuple ? ModelPropTuple<T> :
        T extends ValidPropObject ? ModelPropObject<T> :
        never;

    type ValidDerivedProp = {
        deps: string[];
        fn: (this: any) => any;
        cache?: boolean;
    };

    type ModelDerivedProp<T, B> = {
        deps: string[];
        fn: (this: B) => T;
        cache?: boolean;
    };

    type ValidCollProp =
        any;

    type ModelCollProp<T> =
        any;

    type ValidDefinitionBase<T> = {
        type?: string;
        props?: {
            [K in keyof T['props']]: ValidProp
        };
        session?: {
            [K in keyof T['session']]: ValidProp
        };
        derived?: {
            [K in keyof T['derived']]: ValidDerivedProp
        };
        collections?: {
            [K in keyof T['collections']]: ValidCollProp
        };
    };

    type ValidDefinition<T> =
        ValidDefinitionBase<T> & {
            [K in (Exclude<T, keyof ValidDefinitionBase>)]: T[K];
        }

    type ModelDefinition<T> =
        {
            [K in keyof T['props']]: ModelProp<T['props'][K]>
        } & {
            [K in keyof T['session']]: ModelProp<T['session'][K]>
        } & {
            [K in keyof T['derived']]: ModelDerivedProp<T['derived'][K]>
        } & {
            [K in keyof T['collections']]: ModelCollProp<T['collections'][K]>;
        } & {
            [K in (Exclude<T, keyof ValidDefinitionBase>)]: T[K];
        }

    export interface HumanModel<Props = {}> extends Backbone.Model<Props> {
        // inheritable methods to the Model prototype.
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

        // mixins from underscore
        keys(): string[];
        values(): any[];
        pairs(): any[];
        invert(): any;
        pick<A extends _StringKey<this>>(keys: A[]): Partial<Pick<this, A>>;
        pick<A extends _StringKey<this>>(...keys: A[]): Partial<Pick<this, A>>;
        pick(fn: (value: any, key: any, object: any) => any): Partial<this>;
        omit<A extends _StringKey<this>>(keys: A[]): Partial<_Omit<this, A>>;
        omit<A extends _StringKey<this>>(...keys: A[]): Partial<_Omit<this, A>>;
        omit(fn: (value: any, key: any, object: any) => any): Partial<this>;

        // define a few fixed properties
        attributes: Record<string, any>;
        json: string;
        derived?: Record<keyof Props, any>;
        toTemplate: Record<string, any>;

        // Properties
        registry: Registry;
        idAttribute: string;
        extraProperties: 'ignore' | 'reject' | 'allow';
    }

    export function define<
        Spec extends ValidDefinition<Spec>,
        Model = ModelDefinition<Spec> & HumanModel<ModelDefinition<Spec>>
    >
        (spec:
            Spec &
            ThisType<Model>
        ): new (attrs?: Attributes, options?: Options) => Model;

    export interface Registry {
        _cache: Record<string, any>;
        _namespaces: Record<string, any>;
        _getCache(ns?: string): Record<string, any>;
        lookup(type: string, id: string | number, ns?: string): any;
        store(model: HumanModel): this;
        remove(type: string, id: string | number, ns?: string): boolean;
        clear(): void;
    }

    export interface DataTypes {
        [key: string]: {
            set?: (newVal: any) => { val: any, type: string };
            get?: (val: any) => any;
        };
    }

    export const registry: Registry;
    export const Registry: Registry;
    export const dataTypes: DataTypes;
}
