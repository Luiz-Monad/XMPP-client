
import { _StringKey, Collection } from 'backbone';

type PropTypeMapping = {
    'string': string;
    'array': object[];
    'bool': boolean;
    'boolean': boolean;
    'date': Date;
    'number': number;
    'object': object;
    '$': JQuery;
};

type ValidPropSimple =
    (keyof PropTypeMapping) |
    (new (...args: any) => any);

type ModelPropSimple<T> =
    T extends keyof PropTypeMapping ? PropTypeMapping[T] :
    T extends new (...args: any) => infer R ? R :
    never;

type ModelPropArray<T, E> =
    T extends 'array' ? ModelPropSimple<E>[] :
    never;

type ValidPropTuple =
    [ValidPropSimple, boolean, any?, ValidPropSimple?];

type ModelPropTuple<T> =
    T extends [infer L, true, any, infer E] ? ModelPropArray<L, E> :
    T extends [infer L, true, any] ? ModelPropSimple<L> :
    T extends [infer L, true] ? ModelPropSimple<L> :
    T extends [infer L, any, any, infer E] ? ModelPropArray<L, E> | undefined :
    T extends [infer L, any, any] ? ModelPropSimple<L> | undefined :
    T extends [infer L, any] ? ModelPropSimple<L> | undefined :
    never;

type ModelPropExtra = {
    default?: any;
    allowNull?: boolean;
    setOnce?: boolean;
    test?: Function;
    values?: any[];
};

type ValidPropObject =
    { type: ValidPropSimple, required?: boolean } & ModelPropExtra;

type ModelPropObject<T> =
    T extends { type: infer L, required: true } & ModelPropExtra ? ModelPropSimple<L> :
    T extends { type: infer L, required?: false } & ModelPropExtra ? ModelPropSimple<L> | undefined :
    never;

type ValidProp =
    ValidPropSimple |
    ValidPropTuple |
    ValidPropObject;

type ModelProp<T> =
    T extends ValidPropSimple ? ModelPropSimple<T> | undefined :
    T extends ValidPropTuple ? ModelPropTuple<T> :
    T extends ValidPropObject ? ModelPropObject<T> :
    never;

type ValidDerivedProp = {
    deps?: string[];
    cache?: boolean;
    fn: any;
}

type ModelDerivedProp<T> =
    ReturnType<T['fn']>;

type ValidCollProp =
    any;

type ModelCollProp<T> =
    InstanceType<T>;

type DefinitionConstraint = {
    props?: any;
    session?: any;
    derived?: any;
    collections?: any;
}

type ValidDefinitionBase<T extends DefinitionConstraint> = {
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
}

export type ValidDefinition<T extends DefinitionConstraint> =
    ValidDefinitionBase<T> & {
        [K in (Exclude<keyof T, keyof DefinitionConstraint>)]: T[K];
    }

export type ModelDefinition<T extends DefinitionConstraint> =
    {
        [K in keyof T['props']]: ModelProp<T['props'][K]>
    } & {
        [K in keyof T['session']]: ModelProp<T['session'][K]>
    } & {
        [K in keyof T['derived']]: ModelDerivedProp<T['derived'][K]>
    } & {
        [K in keyof T['collections']]: ModelCollProp<T['collections'][K]>;
    } & {
        [K in (Exclude<keyof T, keyof DefinitionConstraint>)]: T[K];
    }

export interface HumanModel<
    Props extends Backbone.ObjectHash = any,
    SetOptions extends Backbone.ModelSetOptions = any,
    InitOptions = any,
> extends Backbone.Model<Props, SetOptions, InitOptions> {

    // inheritable methods to the Model prototype.
    getId(): string | number;
    // initialize(attributes?: Props, options?: Backbone.CombinedModelConstructorOptions<InitOptions, this>): void;
    // parse(response: any, options?: any): any;
    serialize(): this;
    remove(): this;
    // set<A extends _StringKey<Props>>(attributeName: A, value?: Props[A], options?: S): this;
    // set(attributeName: Partial<Props>, options?: S): this;
    // set<A extends _StringKey<Props>>(attributeName: A | Partial<Props>, value?: Props[A] | S, options?: S): this;
    // get<A extends _StringKey<Props>>(attributeName: A): Props[A] | undefined;
    toggle(property: string): this;
    // previousAttributes(): Partial<Props>;
    // save(attributes?: Partial<Props> | null, options?: ModelSaveOptions): JQueryXHR;
    // fetch(options?: ModelFetchOptions): JQueryXHR;
    // destroy(options?: ModelDestroyOptions): JQueryXHR | false;
    // hasChanged(attribute?: _StringKey<Props>): boolean;
    // changedAttributes(attributes?: Partial<Props>): Partial<Props> | false;
    // toJSON(options?: any): any;
    // has(attribute: _StringKey<Props>): boolean;
    // url: () => string;
    // isNew(): boolean;
    clone(): this; //override
    // isValid(options?: any): boolean;
    // escape(attribute: _StringKey<Props>): string;
    // sync(...arg: any[]): JQueryXHR;
    // unset(attribute: _StringKey<Props>, options?: Silenceable): this;
    // clear(options?: Silenceable): this;
    // previous<A extends _StringKey<Props>>(attribute: A): Props[A] | null | undefined;
    addListVal(prop: string, value: any, prepend?: boolean): this;
    removeListVal(prop: string, value: any): this;
    hasListVal(prop: string, value: any): boolean;

    // mixins from underscore
    // keys(): string[];
    // values(): any[];
    // pairs(): any[];
    // invert(): any;
    // pick<A extends _StringKey<this>>(keys: A[]): Partial<Pick<this, A>>;
    // pick<A extends _StringKey<this>>(...keys: A[]): Partial<Pick<this, A>>;
    // pick(fn: (value: any, key: any, object: any) => any): Partial<this>;
    // omit<A extends _StringKey<this>>(keys: A[]): Partial<Omit<this, A>>;
    // omit<A extends _StringKey<this>>(...keys: A[]): Partial<Omit<this, A>>;
    // omit(fn: (value: any, key: any, object: any) => any): Partial<this>;

    // define a few fixed properties
    // attributes: Partial<Props>;
    json: string;
    derived?: Partial<Props>;
    toTemplate: Record<string, any>;

    // Properties
    registry: Registry;
    idAttribute: string;
    extraProperties: 'ignore' | 'reject' | 'allow';
}

export type DefineFnType = typeof define;

export type Attributes<T> = Partial<ModelDefinition<T>>;

export type Options = Record<string, any>;

function define<
    Spec extends ValidDefinition<Spec>
>
    (spec:
        Spec &
        ThisType<ModelDefinition<Spec> & HumanModel<ModelDefinition<Spec>>>
    ): new (attrs?: Attributes<Spec>, options?: Options) =>
        ModelDefinition<Spec> & HumanModel<ModelDefinition<Spec>>;

export type RegistryType = new () => Registry;

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

const registry: Registry;
const Registry: Registry;
const dataTypes: DataTypes;

export default {
    define: define,
    registry: registry,
    Registry: Registry,
    dataTypes: dataTypes
};
