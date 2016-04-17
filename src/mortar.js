import _ from 'lodash';
import isClass from 'is-class';

// This regex detects the arguments portion of a function definition
// Thanks to Angular for the regex
const FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
const ERROR_PREFIX = '[Trowel]';

/**
 * Mortar Context
 */
export default class Context {
	/**
	 *
	 * @param {Object} [module] node module
	 * @param {Context} [parent] parent context
	 */
	constructor(module, parent) {
		if (!parent && module instanceof Context) {
			parent = module;
			module = parent.module;
		}

		/**
		 * The module object used to resolve lazy requires.
		 * @example
		 * import Context from 'mortar'
		 * import assert from 'assert'
		 * 
		 * const context = new Context(module);
		 * assert.strictEqual(module, context.module);
		 * context.require('./models/User').as.singleton('CurrentUser');
		 * context.retrieve('CurrentUser'); //lazily required the User model relative to this module
		 * 
		 * @type {Object}
		 */
		this.module = module;
		/**
		 * The parent {@link Context} instance. Allows to set up hierarchical dependency injection containers.
		 * @example
		 * import Context from 'mortar'
		 * import assert from 'assert'
		 * const context = Context.create();
		 * const child = context.spawn();
		 * assert.strictEqual(child.parent, context);
		 * @type {Context}
		 */
		this.parent = parent;
		this._cache = new Map();
		/**
		 *
		 * @type {Map<string,function>}
		 */
		this.providers = new Map();
		for (let [name, configure] of Context.providers) {
			this.providers.set(name, configure(this));
		}
	}

	/**
	 * Registers a value to a provider for `key`.
	 * @example
	 * import Context from 'mortar'
	 * import assert from 'assert'
	 * const context = Context.create();
	 * function foo(){
	 * 	return {};
	 * }
	 * context.wire(foo).as.singleton('foo'); // always returns the same object
	 * const f1 = context.retrieve('foo');
	 * const f2 = context.retrieve('foo');
	 * assert.strictEqual(f1, f2);
	 * @example
	 * import Context from 'mortar'
	 * import assert from 'assert'
	 * const context = Context.create();
	 * function foo(){
	 * 	return {};
	 * }
	 * context.wire(foo).as.producer('foo'); // returns a new object every time we retrieve "foo"
	 * const f1 = context.retrieve('foo');
	 * const f2 = context.retrieve('foo');
	 * assert.notStrictEqual(f1, f2);
	 * @example
	 * import Context from 'mortar'
	 * import assert from 'assert'
	 * const context = Context.create();
	 * function foo(){
	 * 	return {};
	 * }
	 * context.wire(foo).as.value('foo'); // returns the `foo` function
	 * const f = context.retrieve('foo');
	 * assert.strictEqual(f, foo);
	 * @param {*} subject - The value you want to register to the context
	 * @param {boolean} [constructable=false] - whether `new` should be used or the function should be called directly
	 * @throws {Error} when `subject` is `undefined`
	 * @throws {Error} when `key` already registered
	 * @throws {Error} when `key` not a String
	 * @returns {object}
	 * @property {function(key: string):Context} as.singleton - registers `subject` as a singleton provider for `key`
	 * @property {function(key: string):Context} as.producer - registers `subject` as a producer for `key`
	 * @property {function(key: string):Context} as.value - registers `subject` as a value for `key`
	 */
	wire(subject, constructable = false) {
		let as = {};
		for (let [name, provide] of this.providers) {
			as[name] = ((provide, name) => {
				return (key) => {
					if (typeof subject === 'undefined') {
						throw new Error(`${ERROR_PREFIX} Cannot wire 'undefined' as a ${name}`);
					}
					if (this.has(key)) {
						throw new Error(`${ERROR_PREFIX} Wiring already exists for key '${key}'`);
					} else if (!_.isString(key) || key === '') {
						throw new Error(`${ERROR_PREFIX} Cannot use ${key} as a key for wiring`);
					}
					this._cache.set(key, {subject: subject, provide: provide, constructable: constructable});
					return this;
				};
			})(provide, name);
		}
		as.as = as;
		return as;
	}

	/**
	 * Sets up lazy `require`ing of `id` when `key` is requested, relative to `module`.
	 * 
	 * See {@link Context#wire}
	 * @example
	 * import Context from 'mortar'
	 * 
	 * const context = Context.create(module);
	 * context.require('./models/User').as.singleton('CurrentUser');
	 * // no code has been loaded yet
	 * context.retrieve('CurrentUser');
	 * // now './models/User' is resolved and used to produce a singleton instance
	 * @param {String} id - the module id, e.g. "lodash" or "./models/User"
	 * @returns {object}
	 * @property {function(key: string):Context} as.singleton - registers `id` to be lazily required as a singleton provider for `key`
	 * @property {function(key: string):Context} as.producer - registers `id` to be lazily required as a producer for `key`
	 * @property {function(key: string):Context} as.value - registers `id` to be lazily required as a value for `key`
	 */
	require(id) {
		if (!this.module) {
			throw new Error(`${ERROR_PREFIX} Cannot require without providing a module to the constructor`);
		}
		const wrapped = ()=> {
			return this.module.require(id);
		};
		wrapped.__mortar_wrapped = true;
		return this.wire(wrapped);
	}

	/**
	 * Unregisters `key`
	 * 
	 * @example
	 * import Context from 'mortar'
	 * import assert from 'assert'
	 * 
	 * const context = Context.create();
	 * context.wire(42).as.value('the answer to life, the universe and everything');
	 * assert.ok(context.has('the answer to life, the universe and everything'));
	 * context.release('the answer to life, the universe and everything');
	 * assert.ok(! context.has('the answer to life, the universe and everything'));
	 * @param {String} key - registration key
	 */
	release(key) {
		this._cache.delete(key);
	}

	/**
	 * Retrieves `subject`'s dependencies and calls it.
	 * 
	 * @example
	 * import Context from 'mortar'
	 * 
	 * function qux(){
	 *   return 'and thanks for all the fish!';
	 * }
	 * const context = Context.create();
	 * context
	 *   .wire('So long').as.value('foo')
	 *   .wire(qux).as.producer('qux');
	 * 
	 * context.resolve(function (foo, qux){
	 *   console.log(foo, qux); // outputs: So long, and thanks for all the fish!
	 * });
	 * @param {Function} subject
	 * @param {Boolean} [constructable=false] - whether `new` should be used or the function should be called directly
	 * @returns {*}
	 */
	resolve(subject, constructable = false) {
		return this.using(this.parent || {}).resolve(subject, constructable);
	}

	/**
	 * Allows you to override registered dependencies through another {@link Context} or mapping.
	 * @example
	 * import Context from 'mortar'
	 * 
	 * const context = Context.create();
	 * context
	 *   .wire('So long').as.value('foo')
	 *   .wire('and thanks for all the fish!').as.value('qux');
	 * 
	 * const subject = function (foo, qux){
	 *   console.log(foo, qux);
	 * );
	 * 
	 * context.using({
	 *   foo: 'Adieu'
	 * }).resolve(subject);
	 * //outputs: Adieu, and thanks for all the fish!
	 * @param {Context|Object} contextOrMap
	 * @returns {{resolve: resolve}}
	 */
	using(contextOrMap) {
		const context = this;
		if (_.isArray(contextOrMap) || (!_.isObject(contextOrMap) && !isContext(contextOrMap))) {
			throw new Error(`${ERROR_PREFIX} Cannot use anything else but an object or Context 
				to override dependency resolutions`);
		} else if (_.isFunction(contextOrMap)) { //functions are objects too, i.e. won't branch into "if"
			contextOrMap = this.resolve(contextOrMap);
		}
		return {
			resolve: function(subject, constructable = false) {
				if (!_.isFunction(subject)) {
					throw new Error(`{ERROR_PREFIX} Cannot resolve anything else but a function`);
				}
				const dependencies = Context.getDependencies(subject);
				let resolved;
				if (isContext(contextOrMap)) {
					resolved = dependencies.map((dependency) => {
						return contextOrMap._retrieveWithFallback(dependency, context);
					});
				} else {
					resolved = dependencies.map((dependency) => {
						let value = contextOrMap[dependency];
						if (typeof value === 'undefined') {
							value = context.retrieve(dependency);
						}
						return value;
					});
				}
				return (constructable || isClass(subject)) ? new subject(...resolved) : subject(...resolved);
			}
		};
	}

	_retrieveWithFallback(key, fallback) {
		let config = this._cache.get(key);
		let value;
		if (!config) {
			if (fallback) {
				value = fallback.retrieve(key);
			}
		} else {
			if (_.get(config.subject, '__mortar_wrapped', false)) {
				config.subject = config.subject();
			}
			value = config.provide(config.subject, config.constructable);
		}
		if (typeof value === 'undefined') {
			throw new Error(`${ERROR_PREFIX} wiring not found for key '${key}'`);
		}
		return value;
	}

	/**
	 * Retrieves the value registered to `key` using whatever rule it was wired with.
	 * @example
	 * import Context from 'mortar'
	 * import assert from 'assert'
	 * const context = Context.create();
	 * function foo(){
	 * 	return {};
	 * }
	 * context.wire(foo).as.singleton('foo'); // always returns the same object
	 * const f1 = context.retrieve('foo');
	 * const f2 = context.retrieve('foo');
	 * assert.strictEqual(f1, f2);
	 * @param {!String} key
	 * @returns {*}
	 */
	retrieve(key) {
		return this._retrieveWithFallback(key, this.parent);
	}

	/**
	 * Checks whether a rule is registered to `key`.
	 * @example
	 * import Context from 'mortar'
	 * import assert from 'assert'
	 * const context = Context.create();
	 * assert.ok(! context.has('foo'));
	 * context.wire(42).as.value('foo');
	 * assert.ok(context.has('foo'));
	 * @param {!String} key
	 * @returns {boolean}
	 */
	has(key) {
		return this._cache.has(key);
	}

	/**
	 * Spawns a child context
	 * @example
	 * import Context from 'mortar'
	 * import assert from 'assert'
	 * const context = Context.create();
	 * const child = context.spawn();
	 * assert.strictEquals(child.parent, context);
	 * @returns {Context}
	 */
	spawn() {
		return Context.create(this.module, this);
	}

	/**
	 * Parses the dependencies of a function, by name.
	 * 
	 * @example
	 * import Context from 'mortar'
	 * function foo( baz, qux, lodash ){}
	 * Context.getDependencies(foo); // ['baz', 'qux', 'lodash']
	 * @param {!Function} subject
	 * @returns {Array.<String>}
	 */
	static getDependencies(subject) {
		if (!_.isFunction(subject)) {
			throw new Error(`${ERROR_PREFIX} cannot retrieve dependencies of anything else but a function`);
		}
		return Function.prototype.toString.call(subject)
			.match(FN_ARGS)[1]
			.split(',')
			.map((i) => i.trim())
			.filter((i)=>i);
	}

	/**
	 * Factory method, creates a new context instance; thin wrapper for:
	 * ```js
	 * new Context(module, parent)
	 * ```
	 * See {@link Context#constructor}
	 * @param {Object} [module] node module
	 * @param {Context} [parent] parent context
	 * @returns {Context}
	 */
	static create(module, parent) {
		return new Context(module, parent);
	}

	/**
	 * Registers a provider to all instances. Either provide a named function, or an object with `name` and `configure` propterties
	 * @param {Function|Object} provider
	 * @param {!String} provider.name
	 * @param {Function} provider.configure
	 * @returns {Context}
	 */
	static register(provider) {
		if (!Context.providers) {
			Context.providers = new Map();
		} else if (Context.providers.has(provider.name)) {
			throw new Error(`${ERROR_PREFIX} provider already registered for '${provider.name}'`);
		}
		Context.providers.set(provider.name, provider.configure || provider);
		return Context;
	}
}

/**
 * Wrapper for 
 * ```js
 * subject instanceof Context
 * ```
 * @param {*} subject
 * @returns {boolean}
 */
export function isContext(subject) {
	return subject instanceof Context;
}

Context
	.register(function singleton(context) {
		return function getOrCreateInstance(factory, constructable=false) {
			if (typeof this.instance === 'undefined') {
				this.instance = context.resolve(factory, constructable);
			}
			return this.instance;
		};
	})
	.register(function value(/*context*/) {
		return (value) => value;
	})
	.register(function producer(context) {
		return (factory, constructable=false) => context.resolve(factory, constructable);
	})
;
