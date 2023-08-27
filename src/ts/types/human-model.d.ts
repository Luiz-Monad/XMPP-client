
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
        T extends keyof PropTypeMapping ? PropTypeMapping[T] | undefined :
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

    type ValidPropCtor =
        new (...args: any) => any;

    type ModelPropCtor<T> =
        T extends new (...args: any) => infer R ? R :
        never;

    type ValidProp =
        ValidPropSimple |
        ValidPropTuple |
        ValidPropObject |
        ValidPropCtor;

    type ModelProp<T> =
        T extends ValidPropSimple ? ModelPropSimple<T> :
        T extends ValidPropTuple ? ModelPropTuple<T> :
        T extends ValidPropObject ? ModelPropObject<T> :
        T extends ValidPropCtor ? ModelPropCtor<T> :
        never;

    type ValidDerivedProp = {
        deps?: string[];
        cache?: boolean;
        fn: any;
    };

    type ModelDerivedProp<T> =
        ReturnType<T['fn']>;

    type ValidCollProp =
        any;

    type ModelCollProp<T> =
        T;

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
    };

    type ValidDefinition<T extends DefinitionConstraint> =
        ValidDefinitionBase<T> & {
            [K in (Exclude<keyof T, keyof DefinitionConstraint>)]: T[K];
        }

    type ModelDefinition<T extends DefinitionConstraint> =
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

    export interface HumanModel<Props extends Backbone.ObjectHash = any, SetOptions extends Backbone.ModelSetOptions = any, InitOptions = any> extends Backbone.Model<Props, SetOptions, InitOptions> {
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

    export function define<
        Spec extends ValidDefinition<Spec>
    >
        (spec:
            Spec &
            ThisType<ModelDefinition<Spec>>
        ): new (attrs?: Attributes, options?: Options) =>
            ModelDefinition<Spec> & HumanModel<ModelDefinition<Spec>>;

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
