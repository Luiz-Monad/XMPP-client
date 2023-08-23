
declare module 'human-view' {
    import * as Backbone from 'backbone';
    import * as _ from 'underscore';

    export interface HumanViewOptions<Props = {}, Model extends Backbone.Model<Props> = Backbone.Model<Props>> extends Backbone.ViewOptions<Model> {
        template?: string | ((this: HumanView<Model>, context?: any) => string);
        textBindings?: Record<keyof Props, string>;
        htmlBindings?: Record<keyof Props, string>;
        srcBindings?: Record<keyof Props, string>;
        hrefBindings?: Record<keyof Props, string>;
        attributeBindings?: Record<keyof Props, [string, string]>;
        inputBindings?: Record<keyof Props, string>;
        classBindings?: Record<keyof Props, string>;
    }

    interface HumanViewMethods<Props = {}, Model extends Backbone.Model<Props> = Backbone.Model<Props>> {
        registerSubview(this: HumanView<Props, Model>, view: Backbone.View<Backbone.Model>): Backbone.View<Backbone.Model>;
        renderSubview(this: HumanView<Props, Model>, view: Backbone.View<Backbone.Model>, container: string | HTMLElement): Backbone.View<Backbone.Model>;
        registerBindings(this: HumanView<Props, Model>, specificModel?: Props, Model, bindings?: HumanViewOptions<Props, Model>): this;
        renderAndBind(this: HumanView<Props, Model>, context?: any, templateArg?: string | ((context?: any) => string)): this;
        getByRole(this: HumanView<Props, Model>, role: string): HTMLElement | undefined;
        getMatches(this: HumanView<Props, Model>, el: HTMLElement, selector: string): JQuery;
        renderWithTemplate(this: HumanView<Props, Model>, context?: any, templateArg?: string | ((context?: any) => string)): void;
        addReferences(this: HumanView<Props, Model>, hash: Record<string, string>): void;
        listenToAndRun(this: HumanView<Props, Model>, object: any, events: string, handler: Function): void;
        animateRemove(this: HumanView<Props, Model>): void;
        renderCollection(this: HumanView<Props, Model>, collection: Backbone.Collection<Props, Model>, ViewClass: typeof Backbone.View, container: HTMLElement, opts?: any): void;
        remove(this: HumanView<Props, Model>): this;
    }

    interface HumanView<Props = {}, Model extends Backbone.Model<Props> = Backbone.Model<Props>> extends Backbone.View<Model>, HumanViewMethods<Props, Model> {
        options?: HumanViewOptions<Props, Model>;
    }

    interface HumanViewConstructor {
        new <Props = {}, Model extends Backbone.Model<Props> = Backbone.Model<Props>>(options?: HumanViewOptions<Props, Model>): HumanView<Props, Model>;
        prototype: HumanView<any, any>;
        extend<Props, Model extends Backbone.Model<Props> = Backbone.Model<Props>>(protoProps: Props & ThisType<HumanView<Props, Model> & Props>, staticProps?: any
        ): this & Props;
    }

    const HumanView: HumanViewConstructor;

    export = HumanView;
}
