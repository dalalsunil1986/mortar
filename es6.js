// This regex detects the arguments portion of a function definition
// Thanks to Angular for the regex

import _ from 'lodash';

const FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
const ERROR_PREFIX = '[Trowel]';

export default class Context {
	constructor(parent) {
		this.parent = parent;
		this._cache = new Map();
		this.providers = new Map();
		for (let [name, create] of Context.providers) {
			this.providers.set(name, create(this));
		}
	}

	wire(subject) {
		let as = {};
		for (let [name, configure] of this.providers) {
			as[name] = (configure => {
				return key => {
					if (typeof subject === 'undefined') {
						throw new Error(`${ERROR_PREFIX} Cannot wire 'undefined' as a ${name}`);
					}
					if (this.has(key)) {
						throw new Error(`${ERROR_PREFIX} Wiring already exists for key '${key}'`);
					} else if (!_.isString(key) || key === '') {
						throw new Error(`${ERROR_PREFIX} Cannot use ${key} as a key for wiring`);
					}
					this._cache.set(key, configure(subject));
					return this;
				};
			})(configure);
		}
		return {as: as};
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
		} else if (_.isFunction(contextOrMap)) {
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
					resolved = dependencies.map(dependency => {
						return contextOrMap._retrieveWithFallback(dependency, context);
					});
				} else {
					resolved = dependencies.map(dependency => {
						let value = contextOrMap[dependency];
						if (typeof value === 'undefined') {
							value = context.retrieve(dependency);
						}
						return value;
					});
				}
				return subject(...resolved);
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
			value = config.provide();
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
		//todo: throw error if it's not a function
		return Function.prototype.toString.call(subject)
			.match(FN_ARGS)[1]
			.split(',')
			.map(function(i) {
				return i.trim();
			})
			.filter(function(i) {
				return i;
			});
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
			throw new Error(`${ERROR_PREFIX} provider already registered for ''${provider.name}`);
		}
		Context.providers.set(provider.name, provider.create);
		return Context;
	}
}

Context
	.register({
		name  : 'singleton',
		create: context => {
			return factory => {
				//todo: check subject is function
				let instance;
				return {
					provide: () => {
						return instance = (typeof instance !== 'undefined')
							? instance
							: context.resolve(factory);
					}
				};
			};
		}
	})
	.register({
		name  : 'value',
		create: () => {
			return value => {
				return {provide: () => value};
			};
		}
	})
	.register({
		name  : 'producer',
		create: context => {
			return factory => {
				return {provide: () => context.resolve(factory)};
			};
		}
	});

