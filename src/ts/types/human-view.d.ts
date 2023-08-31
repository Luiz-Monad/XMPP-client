
declare module 'human-view' {
    import * as Backbone from 'backbone';
    import * as _ from 'underscore';
    import { ValidDefinition as ModelValid, ModelDefinition } from 'human-model';

    export interface Bindings<Model = {}> {
        textBindings?: Partial<Record<keyof Model, string>>;
        htmlBindings?: Partial<Record<keyof Model, string>>;
        srcBindings?: Partial<Record<keyof Model, string>>;
        hrefBindings?: Partial<Record<keyof Model, string>>;
        attributeBindings?: Partial<Record<keyof Model, [string, string]>>;
        inputBindings?: Partial<Record<keyof Model, string>>;
        classBindings?: Partial<Record<keyof Model, string>>;
    }

    export interface HumanViewOptions<
        Model extends Backbone.Model<any> = Backbone.Model<any>,
    > extends Backbone.ViewOptions<Model>, Bindings<Model> {
        template?: string | ((this: HumanView<Model>, context?: any) => string);
    }

    export interface HumanViewMethods<
        Model extends Backbone.Model<any> = Backbone.Model<any>,
    > {

        registerSubview(this: HumanView<Model>,
            view: Backbone.View<Backbone.Model>): Backbone.View<Backbone.Model>;

        renderSubview(this: HumanView<Model>,
            view: Backbone.View<Backbone.Model>,
            container: string | HTMLElement): Backbone.View<Backbone.Model>;

        registerBindings<
            SubModel extends Backbone.Model<any> = Backbone.Model<any>
        >(this: HumanView<Model>,
            specificModel?: SubModel,
            bindings?: HumanViewOptions<SubModel>): this;

        renderAndBind(this: HumanView<Model>,
            context?: any,
            templateArg?: string | ((context?: any) => string)): this;

        getByRole(this: HumanView<Model>,
            role: string): HTMLElement | undefined;

        getMatches(this: HumanView<Model>,
            el: HTMLElement,
            selector: string): JQuery;

        renderWithTemplate(this: HumanView<Model>,
            context?: any,
            templateArg?: string | ((context?: any) => string)): void;

        addReferences(this: HumanView<Model>,
            hash: Record<string, string>): void;

        listenToAndRun(this: HumanView<Model>,
            object: any,
            events: string,
            handler: Function): void;

        animateRemove(this: HumanView<Model>): void;

        renderCollection<
            SubModel extends Backbone.Model<any> = Backbone.Model<any>
        >(this: HumanView<Model>,
            collection: Backbone.Collection<SubModel>,
            ViewClass: typeof Backbone.View<SubModel>,
            container: HTMLElement | JQuery<HTMLElement>,
            opts?: any): void;

        remove(this: HumanView<Model>): this;

    }

    export interface HumanView<
        Model extends Backbone.Model<any> = Backbone.Model<any>,
    > extends Backbone.View<Model>, HumanViewMethods<Model> {
        options?: HumanViewOptions<Model>;
        parent?: HumanView<any>;
    }

    type ValidBindings<Model, T extends Bindings<Model>> = {
        [B in keyof Bindings]?: {
            [K in keyof T[B]]:
            K extends keyof Model ? string : never
        };
    }

    type ValidDefinition<
        Model extends Backbone.Model<any>,
        T extends HumanViewOptions<Model>,
    > = HumanViewOptions<Model> &
        ValidBindings<Model, T> & {
            [K in (Exclude<keyof T, keyof HumanViewOptions>)]: T[K];
        } & ModelValid<T>

    export interface HumanViewConstructor<
        Model extends Backbone.Model<any> = Backbone.Model<any>,
        BaseProps = {},
        BaseStaticProps = {},
    > {

        new(options?: HumanViewOptions<Model>):
            HumanView<Model> & BaseProps & BaseStaticProps;

        prototype: HumanView<Model> & BaseProps & BaseStaticProps;

        define<
            Model extends Backbone.Model<any> = Backbone.Model<any>
        >(): HumanViewConstructor<Model,
            BaseProps, BaseStaticProps>;

        extend<
            Props extends ValidDefinition<Model, Props> = {},
            StaticProps = {},
            NewHumanView = HumanView<Model> & ModelDefinition<Props> &
            BaseProps & Props & BaseStaticProps & StaticProps,
        >
            (
                protoProps:
                    Props & ThisType<NewHumanView>,
                staticProps?:
                    StaticProps & ThisType<NewHumanView>,
            ): HumanViewConstructor<Model,
                BaseProps & Props,
                BaseStaticProps & StaticProps>;
    }

    const HumanView: HumanViewConstructor;

    export = HumanView;
}
