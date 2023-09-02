//   (c) 2013 Henrik Joreteg
//   MIT Licensed
//   For all details and documentation:
//   https://github.com/HenrikJoreteg/human-model
//

/// <reference path="../types/human-model.d.ts" />

import Backbone from 'backbone';
import _ from 'underscore';

import { DataTypes, DefineFnType, RegistryType } from '../types/human-model';

// Initial setup
// -------------

const slice = Array.prototype.slice;

// In backbone, when you add an already instantiated model to a collection
// the collection checks to see if what you're adding is already a model
// the problem is, it does this witn an instanceof check. We're wanting to
// use completely different models so the instanceof will fail even if they
// are "real" models. So we work around this by overwriting this method from
// backbone 1.0.0. The only difference is it looks for an initialize method
// (which both Backbone and HumanModel will always have) to determine whether
// an instantiated model or a simple object is being passed in.
(Backbone.Collection.prototype as any)._prepareModel = function (attrs: any, options: any) {
    if (_.isFunction(attrs.initialize)) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
    }
    options || (options = {});
    options.collection = this;
    const model = new this.model(attrs, options);
    if (!model._validate(attrs, options)) {
        this.trigger('invalid', this, attrs, options);
        return false;
    }
    return model;
};

const arrayNext = function (array: any, currentItem: any) {
    const len = array.length;
    let newIndex = array.indexOf(currentItem) + 1;
    if (newIndex > (len - 1)) newIndex = 0;
    return array[newIndex];
};

const createDerivedProperty = function (modelProto: any, name: any, definition: any) {
    const def = modelProto._derived[name] = {
        fn: _.isFunction(definition) ? definition : definition.fn,
        cache: (definition.cache !== false),
        depList: definition.deps || []
    };

    // add to our shared dependency list
    _.each(def.depList, function (dep) {
        modelProto._deps[dep] = _(modelProto._deps[dep] || []).union([name]);
    });

    // defined a top-level getter for derived names
    Object.defineProperty(modelProto, name, {
        get: function () {
            return this._getDerivedProperty(name);
        },
        set: function () {
            throw new TypeError('"' + name + '" is a derived property, it can\'t be set directly.');
        }
    });
};


// Registry
// ---------------

// Internal storage for models, seperate namespace
// storage from default to prevent collision of matching
// model type+id and namespace name

const Registry: RegistryType = (function (this: any) {
    this._cache = {};
    this._namespaces = {};
}) as any;

// Attach all inheritable methods to the Registry prototype.
_.extend(Registry.prototype, {
    // Get the general or namespaced internal cache
    _getCache: function (ns: string) {
        if (ns) {
            this._namespaces[ns] || (this._namespaces[ns] = {});
            return this._namespaces[ns];
        }
        return this._cache;
    },

    // Find the cached model
    lookup: function (type: string, id: string | number, ns?: string) {
        const cache = this._getCache(ns);
        return cache && cache[type + id];
    },

    // Add a model to the cache if it has not already been set
    store: function (model: any) {
        const cache = this._getCache(model._namespace),
            key = model.type + model.getId();
        // Prevent overriding a previously stored model
        cache[key] = cache[key] || model;
        return this;
    },

    // Remove a stored model from the cache, return `true` if removed
    remove: function (type: string, id: string | number, ns?: string) {
        const cache = this._getCache(ns);
        if (this.lookup.apply(this, arguments)) {
            delete cache[type + id];
            return true;
        }
        return false;
    },

    // Reset internal cache
    clear: function () {
        this._cache = {};
        this._namespaces = {};
    }
});

// HumanModel
// ------------
const registry = new Registry();

// our dataTypes
const dataTypes: DataTypes = {
    date: {
        set: function (newVal: any) {
            let newType;
            if (!_.isDate(newVal)) {
                try {
                    newVal = (new Date(parseInt(newVal, 10))).valueOf();
                    newType = 'date';
                } catch (e) {
                    newType = typeof newVal;
                }
            } else {
                newType = 'date';
                newVal = newVal.valueOf();
            }
            return {
                val: newVal,
                type: newType
            };
        },
        get: function (val: any) {
            return new Date(val);
        }
    },
    array: {
        set: function (newVal: any) {
            return {
                val: newVal,
                type: _.isArray(newVal) ? 'array' : typeof newVal
            };
        }
    },
    object: {
        set: function (newVal: any) {
            let newType = typeof newVal;
            // we have to have a way of supporting "missing" objects.
            // Null is an object, but setting a value to undefined
            // should work too, IMO. We just override it, in that case.
            if (newType !== 'object' && _.isUndefined(newVal)) {
                newVal = null;
                newType = 'object';
            }
            return {
                val: newVal,
                type: newType
            };
        }
    }
};

const define: DefineFnType = (function (spec: any) {
    spec || (spec = {});

    // create our constructor
    const HumanModel = function (this: any, attrs: any, options: any) {
        attrs || (attrs = {});
        options || (options = {});
        this.cid = _.uniqueId('model');
        // set the collection if passed in
        this.collection = options.collection || undefined;
        if (options.parse) attrs = this.parse(attrs, options) || {};
        this.registry = options.registry || registry;
        options._attrs = attrs;
        this._namespace = options.namespace;
        this._initted = false;
        this._values = {};
        this._initCollections();
        this._cache = {};
        this._previousAttributes = {};
        this._events = {};

        this.set(attrs, _.extend({ silent: true, initial: true }, options));
        this._changed = {};
        this.initialize.apply(this, arguments);
        if (attrs[this.idAttribute]) this.registry.store(this);
        this._initted = true;
        if (this.seal) {
            Object.seal(this);
        }
    };

    // define a few fixed properties
    Object.defineProperties(HumanModel.prototype, {
        attributes: {
            get: function () {
                return this._getAttributes(true);
            }
        },
        json: {
            get: function () {
                return JSON.stringify(this.serialize());
            }
        },
        derived: {
            get: function () {
                const res: Record<string, any> = {};
                for (const item in this._derived) res[item] =
                    this._derived[item].fn.apply(this);
                return res;
            }
        },
        toTemplate: {
            get: function () {
                return _.extend(this._getAttributes(true), this.derived);
            }
        }
    });



    // Attach all inheritable methods to the Model prototype.
    _.extend(HumanModel.prototype, Backbone.Events, {
        idAttribute: 'id',

        // storage for our rules about derived properties
        _derived: {},
        _deps: {},
        _definition: {},

        // can be allow, ignore, reject
        extraProperties: 'ignore',

        getId: function () {
            return this.get(this.idAttribute);
        },

        // stubbed out to be overwritten
        initialize: function () {
            return this;
        },

        // backbone compatibility
        parse: function (resp: any, options: unknown) {
            return resp;
        },

        // serialize does nothing by default
        serialize: function () {
            return this._getAttributes(false, true);
        },

        // Remove model from the registry and unbind events
        remove: function () {
            if (this.getId()) {
                this.registry.remove(this.type, this.getId(), this._namespace);
            }
            this.trigger('remove', this);
            this.off();
            return this;
        },

        set: function (key: any, value: any, options: any) {
            const self = this;
            const extraProperties = this.extraProperties;
            let attrs: any;

            // Handle both `"key", value` and `{key: value}` -style arguments.
            if (_.isObject(key) || key === null) {
                attrs = key;
                options = value;
            } else {
                attrs = {};
                attrs[key] = value;
            }

            options = options || {};

            if (!this._validate(attrs, options)) return false;

            // Extract attributes and options.
            const unset = options.unset;
            const silent = options.silent;
            const initial = options.initial;

            const changes = [];
            const changing = this._changing;
            this._changing = true;

            // if not already changing, store previous
            if (!changing) {
                this._previousAttributes = this._getAttributes(true);
                this._changed = {};
            }
            const previous = this._previousAttributes;

            // For each `set` attribute...
            for (const attr in attrs) {
                let newVal = attrs[attr];
                let newType: string = typeof newVal;
                let currentVal = this._values[attr];
                let def = this._definition[attr];

                if (!def) {
                    if (extraProperties === 'ignore') {
                        continue;
                    } else if (extraProperties === 'reject') {
                        throw new TypeError('No "' + attr + '" property defined on ' + (this.type || 'this') + ' model and allowOtherProperties not set.');
                    } else if (extraProperties === 'allow') {
                        def = this._createPropertyDefinition(attr, 'any');
                    }
                }

                // check type if we have one
                if (dataTypes[def.type]) {
                    const cast = dataTypes[def.type].set!(newVal);
                    newVal = cast.val;
                    newType = cast.type;
                }

                // If we've defined a test, run it
                if (def.test) {
                    const err = def.test.call(this, newVal, newType);
                    if (err) {
                        throw new TypeError('Property \'' + attr + '\' failed validation with error: ' + err);
                    }
                }

                // If we are required but undefined, throw error.
                // If we are null and are not allowing null, throw error
                // If we have a defined type and the new type doesn't match, and we are not null, throw error.

                if (_.isUndefined(newVal) && def.required) {
                    throw new TypeError('Required property \'' + attr + '\' must be of type ' + def.type + '. Tried to set ' + newVal);
                }
                if (_.isNull(newVal) && def.required && !def.allowNull) {
                    throw new TypeError('Property \'' + attr + '\' must be of type ' + def.type + ' (cannot be null). Tried to set ' + newVal);
                }
                if ((def.type && def.type !== 'any' && def.type !== newType) && !_.isNull(newVal) && !_.isUndefined(newVal)) {
                    throw new TypeError('Property \'' + attr + '\' must be of type ' + def.type + '. Tried to set ' + newVal);
                }
                if (def.values && !_.contains(def.values, newVal)) {
                    throw new TypeError('Property \'' + attr + '\' must be one of values: ' + def.values.map(function (item: any) { return item.toString(); }).join(', '));
                }

                // enforce `setOnce` for properties if set
                if (def.setOnce && currentVal !== undefined && !_.isEqual(currentVal, newVal)) {
                    throw new TypeError('Property \'' + key + '\' can only be set once.');
                }

                // push to changes array if different
                if (!_.isEqual(currentVal, newVal)) {
                    changes.push({ prev: currentVal, val: newVal, key: attr });
                }

                // keep track of changed attributes
                if (!_.isEqual(previous[attr], newVal)) {
                    self._changed[attr] = newVal;
                } else {
                    delete self._changed[attr];
                }
            }

            // actually update our values
            _.each(changes, function (change) {
                self._previousAttributes[change.key] = change.prev;
                if (unset) {
                    delete self._values[change.key];
                } else {
                    self._values[change.key] = change.val;
                }
            });

            const triggers: any[] = [];

            function gatherTriggers(key: any) {
                triggers.push(key);
                _.each((self._deps[key] || []), function (derTrigger) {
                    gatherTriggers(derTrigger);
                });
            }

            if (!silent && changes.length) self._pending = true;
            _.each(changes, function (change) {
                gatherTriggers(change.key);
            });

            _.each(_.uniq(triggers), function (key) {
                const derived = self._derived[key];
                if (derived && derived.cache && !initial) {
                    const oldDerived = self._cache[key];
                    const newDerived = self._getDerivedProperty(key, true);
                    if (!_.isEqual(oldDerived, newDerived)) {
                        self._previousAttributes[key] = oldDerived;
                        if (!silent) self.trigger('change:' + key, self, newDerived);
                    }
                } else {
                    if (!silent) self.trigger('change:' + key, self, self[key]);
                }
            });

            // You might be wondering why there's a `while` loop here. Changes can
            // be recursively nested within `"change"` events.
            if (changing) return this;
            if (!silent) {
                while (this._pending) {
                    this._pending = false;
                    this.trigger('change', this, options);
                }
            }
            this._pending = false;
            this._changing = false;
            return this;
        },

        get: function (attr: any) {
            return this[attr];
        },

        // Toggle boolean properties or properties that have a `values`
        // array in its definition.
        toggle: function (property: any) {
            const def = this._definition[property];
            if (def.type === 'boolean') {
                // if it's a bool, just flip it
                this[property] = !this[property];
            } else if (def && def.values) {
                // If it's a property with an array of values
                // skip to the next one looping back if at end.
                this[property] = arrayNext(def.values, this[property]);
            } else {
                throw new TypeError('Can only toggle properties that are type `boolean` or have `values` array.');
            }
            return this;
        },

        // Get all of the attributes of the model at the time of the previous
        // `"change"` event.
        previousAttributes: function () {
            return _.clone(this._previousAttributes);
        },

        save: function (key: any, val: any, options: any) {
            let attrs: Record<string, any>
            const attributes = this.attributes;

            // Handle both `"key", value` and `{key: value}` -style arguments.
            if (key == null || typeof key === 'object') {
                attrs = key;
                options = val;
            } else {
                attrs = {};
                attrs[key] = val;
            }

            options = _.extend({ validate: true }, options);

            // If we're not waiting and attributes exist, save acts as
            // `set(attr).save(null, opts)` with validation. Otherwise, check if
            // the model will be valid when the attributes, if any, are set.
            if (attrs && !options.wait) {
                if (!this.set(attrs, options)) return false;
            } else {
                if (!this._validate(attrs, options)) return false;
            }

            // After a successful server-side save, the client is (optionally)
            // updated with the server-side state.
            if (options.parse === void 0) options.parse = true;
            const model = this;
            const success = options.success;
            options.success = function (resp: any) {
                let serverAttrs = model.parse(resp, options);
                if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
                if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
                    return false;
                }
                if (success) success(model, resp, options);
                model.trigger('sync', model, resp, options);
            };
            wrapError(this, options);

            const method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
            if (method === 'patch') options.attrs = attrs;
            // if we're waiting we haven't actually set our attributes yet so
            // we need to do make sure we send right data
            if (options.wait) options.attrs = _.extend(model.serialize(), attrs);
            const xhr = this.sync(method, this, options);

            return xhr;
        },

        // Fetch the model from the server. If the server's representation of the
        // model differs from its current attributes, they will be overridden,
        // triggering a `"change"` event.
        fetch: function (options: any) {
            options = options ? _.clone(options) : {};
            if (options.parse === void 0) options.parse = true;
            const model = this;
            const success = options.success;
            options.success = function (resp: any) {
                if (!model.set(model.parse(resp, options), options)) return false;
                if (success) success(model, resp, options);
                model.trigger('sync', model, resp, options);
            };
            wrapError(this, options);
            return this.sync('read', this, options);
        },

        // Destroy this model on the server if it was already persisted.
        // Optimistically removes the model from its collection, if it has one.
        // If `wait: true` is passed, waits for the server to respond before removal.
        destroy: function (options: any) {
            options = options ? _.clone(options) : {};
            const model = this;
            const success = options.success;

            const destroy = function () {
                model.trigger('destroy', model, model.collection, options);
            };

            options.success = function (resp: any) {
                if (options.wait || model.isNew()) destroy();
                if (success) success(model, resp, options);
                if (!model.isNew()) model.trigger('sync', model, resp, options);
            };

            if (this.isNew()) {
                options.success();
                return false;
            }
            wrapError(this, options);

            const xhr = this.sync('delete', this, options);
            if (!options.wait) destroy();
            return xhr;
        },

        // Determine if the model has changed since the last `"change"` event.
        // If you specify an attribute name, determine if that attribute has changed.
        hasChanged: function (attr: any) {
            if (attr == null) return !_.isEmpty(this._changed);
            return _.has(this._changed, attr);
        },

        // Return an object containing all the attributes that have changed, or
        // false if there are no changed attributes. Useful for determining what
        // parts of a view need to be updated and/or what attributes need to be
        // persisted to the server. Unset attributes will be set to undefined.
        // You can also pass an attributes object to diff against the model,
        // determining if there *would be* a change.
        changedAttributes: function (diff: any) {
            if (!diff) return this.hasChanged() ? _.clone(this._changed) : false;
            let val, changed: any = false;
            const old = this._changing ? this._previousAttributes : this._getAttributes(true);
            for (const attr in diff) {
                if (_.isEqual(old[attr], (val = diff[attr]))) continue;
                (changed || (changed = {}))[attr] = val;
            }
            return changed;
        },

        toJSON: function () {
            return this.serialize();
        },

        // Returns `true` if the attribute contains a value that is not null
        // or undefined.
        has: function (attr: any) {
            return this.get(attr) != null;
        },

        // Default URL for the model's representation on the server -- if you're
        // using Backbone's restful methods, override this to change the endpoint
        // that will be called.
        url: function () {
            const base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
            if (this.isNew()) return base;
            return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.getId());
        },

        // A model is new if it has never been saved to the server, and lacks an id.
        isNew: function () {
            return this.getId() == null;
        },

        // return copy of model
        clone: function () {
            return new this.constructor(this._getAttributes(true));
        },

        // Check if the model is currently in a valid state.
        isValid: function (options: any) {
            return this._validate({}, _.extend(options || {}, { validate: true }));
        },

        // return escaped property
        escape: function (attr: any) {
            return _.escape(this[attr]);
        },

        // Proxy `Backbone.sync` by default -- but override this if you need
        // custom syncing semantics for *this* particular model.
        sync: function () {
            return Backbone.sync.apply(this, arguments as any);
        },

        unset: function (attr: any, options: any) {
            const def = this._definition[attr];
            const type = def.type;
            let val;
            if (def.required) {
                if (!_.isUndefined(def.default)) {
                    val = def.default;
                } else {
                    val = this._getDefaultForType(type);
                }
                return this.set(attr, val, options);
            } else {
                return this.set(attr, val, _.extend({}, options, { unset: true }));
            }
        },

        clear: function (options: any) {
            const self = this;
            _.each(this._getAttributes(true), function (val, key) {
                self.unset(key, options);
            });
            return this;
        },

        // Run validation against the next complete set of model attributes,
        // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
        _validate: function (attrs: any, options: any) {
            if (!options.validate || !this.validate) return true;
            attrs = _.extend({}, this.attributes, attrs);
            const error = this.validationError = this.validate(attrs, options) || null;
            if (!error) return true;
            this.trigger('invalid', this, error, _.extend(options || {}, { validationError: error }));
            return false;
        },

        // Get default values for a certain type
        _getDefaultForType: function (type: any) {
            if (type === 'string') {
                return '';
            } else if (type === 'object') {
                return {};
            } else if (type === 'array') {
                return [];
            }
        },

        // convenience methods for manipulating array properties
        addListVal: function (prop: any, value: any, prepend: any) {
            const list = _.clone(this[prop]) || [];
            if (!_(list).contains(value)) {
                list[prepend ? 'unshift' : 'push'](value);
                this[prop] = list;
            }
            return this;
        },

        previous: function (attr: any) {
            if (attr == null || !Object.keys(this._previousAttributes).length) return null;
            return this._previousAttributes[attr];
        },

        removeListVal: function (prop: any, value: any) {
            const list = _.clone(this[prop]) || [];
            if (_(list).contains(value)) {
                this[prop] = _(list).without(value);
            }
            return this;
        },

        hasListVal: function (prop: any, value: any) {
            return _.contains(this[prop] || [], value);
        },

        // -----------------------------------------------------------------------

        _initCollections: function () {
            if (!this._collections) return;
            for (const coll in this._collections) {
                this[coll] = new this._collections[coll]();
                this[coll].parent = this;
            }
        },

        // Check that all required attributes are present
        _verifyRequired: function () {
            const attrs = this._getAttributes(true); // should include session
            for (const def in this._definition) {
                if (this._definition[def].required && typeof attrs[def] === 'undefined') {
                    return false;
                }
            }
            return true;
        },

        _createPropertyDefinition: function (name: any, desc: any, isSession: any) {
            const self = this;
            const def: any = this._definition[name] = {};
            let type;
            if (_.isString(desc)) {
                // grab our type if all we've got is a string
                type = this._ensureValidType(desc);
                if (type) def.type = type;
            } else {
                type = this._ensureValidType(desc[0] || desc.type);
                if (type) def.type = type;
                if (desc[1] || desc.required) def.required = true;
                // set default if defined
                def.default = !_.isUndefined(desc[2]) ? desc[2] : desc.default;
                def.allowNull = desc.allowNull ? desc.allowNull : false;
                if (desc.setOnce) def.setOnce = true;
                if (def.required && _.isUndefined(def.default)) def.default = this._getDefaultForType(type);
                def.test = desc.test;
                def.values = _.isArray(desc) ? undefined : desc.values;
            }
            if (isSession) def.session = true;

            // define a getter/setter on the prototype
            // but they get/set on the instance
            Object.defineProperty(self, name, {
                set: function (val) {
                    this.set(name, val);
                },
                get: function () {
                    let result = this._values[name];
                    if (typeof result !== 'undefined') {
                        if (dataTypes[def.type] && dataTypes[def.type].get) {
                            result = dataTypes[def.type].get!(result);
                        }
                        return result;
                    }
                    return def.default;
                }
            });

            return def;
        },

        // just makes friendlier errors when trying to define a new model
        // only used when setting up original property definitions
        _ensureValidType: function (type: any) {
            return _.contains(['string', 'number', 'boolean', 'array', 'object', 'date', 'any'].concat(_.keys(dataTypes)), type) ? type : undefined;
        },

        _getAttributes: function (includeSession: any, raw: any) {
            const res: Record<string, any> = {};
            for (const item in this._definition) {
                const def = this._definition[item];
                if (!def.session || (includeSession && def.session)) {
                    let val = (raw) ? this._values[item] : this[item];
                    if (typeof val === 'undefined') val = def.default;
                    if (typeof val !== 'undefined') res[item] = val;
                }
            }
            return res;
        },

        _getDerivedProperty: function (name: any, flushCache: any) {
            // is this a derived property that is cached
            if (this._derived[name].cache) {
                // read through cache
                if (!flushCache && this._cache.hasOwnProperty(name)) {
                    return this._cache[name];
                } else {
                    return this._cache[name] = this._derived[name].fn.apply(this);
                }
            } else {
                return this._derived[name].fn.apply(this);
            }
        }
    });

    // Underscore methods that we want to implement on the Model.
    const modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

    // Mix in each Underscore method as a proxy to `Model#attributes`.
    _.each(modelMethods, function (method) {
        HumanModel.prototype[method] = function () {
            const args = slice.call(arguments);
            args.unshift(this.attributes);
            return (_ as any)[method].apply(_, args);
        };
    });

    for (const key in spec) {
        if (key === 'props' || key === 'session') {
            _.each(spec[key], function (def, name) {
                HumanModel.prototype._createPropertyDefinition.call(HumanModel.prototype, name, def, key === 'session');
            });
            //HumanModel.prototype['_' + key] = spec[key];
        } else if (key === 'derived') {
            _.each(spec[key], function (def, name) {
                createDerivedProperty(HumanModel.prototype, name, def);
            });
        } else if (key === 'collections') {
            HumanModel.prototype._collections = spec[key];
        } else {
            HumanModel.prototype[key] = spec[key];
        }
    }

    HumanModel.registry = registry;

    return HumanModel;
}) as any;

// Wrap an optional error callback with a fallback error event.
const wrapError = function (model: any, options: any) {
    const error = options.error;
    options.error = function (resp: any) {
        if (error) error(model, resp, options);
        model.trigger('error', model, resp, options);
    };
};

// Throw an error when a URL is needed, and none is supplied.
const urlError = function () {
    throw new Error('A "url" property or function must be specified');
};

export default {
    define: define,
    registry: registry,
    Registry: Registry,
    dataTypes: dataTypes
};
