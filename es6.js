import _ from 'lodash';
import isClass from 'is-class';

// This regex detects the arguments portion of a function definition
// Thanks to Angular for the regex
const FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
const ERROR_PREFIX = '[Trowel]';

export default class Context {
	constructor(module, parent) {
		if (!parent && module instanceof Context) {
			parent = module;
			module = parent.module;
		}
		this.module = module;
		this.parent = parent;
		this._cache = new Map();
		this.providers = new Map();
		for (let [name, create] of Context.providers) {
			this.providers.set(name, create(this));
		}
	}

	wire(subject) {
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
					this._cache.set(key, {subject: subject, provide: provide});
					return this;
				};
			})(provide, name);
		}
		return {as: as};
	}

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

	release(key) {
		this._cache.delete(key);
	}

	resolve(subject) {
		return this.using(this.parent || {}).resolve(subject);
	}

	using(contextOrMap) {
		const context = this;
		if (_.isArray(contextOrMap) || (!_.isObject(contextOrMap) && !Context.isContext(contextOrMap))) {
			throw new Error(`${ERROR_PREFIX} Cannot use anything else but an object or Context 
				to override dependency resolutions`);
		} else if (_.isFunction(contextOrMap)) { //functions are objects too, i.e. won't branch into "if"
			contextOrMap = this.resolve(contextOrMap);
		}
		return {
			resolve: function(subject) {
				if (!_.isFunction(subject)) {
					throw new Error(`{ERROR_PREFIX} Cannot resolve anything else but a function`);
				}
				const dependencies = Context.getDependencies(subject);
				let resolved;
				if (Context.isContext(contextOrMap)) {
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
				return (isClass(subject)) ? new subject(...resolved) : subject(...resolved);
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
			value = config.provide(config.subject);
		}
		if (typeof value === 'undefined') {
			throw new Error(`${ERROR_PREFIX} wiring not found for key '${key}'`);
		}
		return value;
	}

	retrieve(key) {
		return this._retrieveWithFallback(key, this.parent);
	}

	has(key) {
		return this._cache.has(key);
	}

	spawn() {
		return Context.create(this);
	}

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

	static create(parent = undefined) {
		return new Context(parent);
	}

	static isContext(subject) {
		return subject instanceof Context;
	}

	static register(provider) {
		if (!Context.providers) {
			Context.providers = new Map();
		} else if (Context.providers.has(provider.name)) {
			throw new Error(`${ERROR_PREFIX} provider already registered for '${provider.name}'`);
		}
		Context.providers.set(provider.name, provider.create || provider);
		return Context;
	}
}

Context
	.register(function singleton(context) {
		return function getOrCreateInstance(factory) {
			if (typeof this.instance === 'undefined') {
				this.instance = context.resolve(factory);
			}
			return this.instance;
		};
	})
	.register(function value(/*context*/) {
		return (value) => value;
	})
	.register(function producer(context) {
		return (factory) => context.resolve(factory);
	})
;
