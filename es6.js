// This regex detects the arguments portion of a function definition
// Thanks to Angular for the regex

const FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;

export default class Context {
	constructor(parent) {
		if (!Context.isContext(this)) {
			return Context.create(parent);
		}
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
					//todo throw error if already registered
					this._cache.set(key, configure(subject));
					return this;
				};
			})(configure);
		}
		return {as: as};
	}

	resolve(subject) {
		//todo: check subject's a function
		const dependencies = Context.getDependencies(subject);
		//todo: throw error if not found
		const resolved = dependencies.map(dependency => this.retrieve(dependency));
		return subject(...resolved);
	}

	using(contextOrMap) {
		const context = this;
		return {
			resolve: function(subject) {
				//todo: handle if subject is not a function
				if (Context.isContext(contextOrMap)) {
					return contextOrMap.resolve(subject);
				}
				const dependencies = Context.getDependencies(subject);
				const resolved = dependencies.map(dependency => {
					var value = contextOrMap[dependency];
					if (typeof value === 'undefined') {
						value = context.retrieve(dependency);
					}
					//todo: throw error if not found
					return value;
				});
				return subject(...resolved);
			}
		};
	}

	retrieve(key) {
		//todo: not found errror
		let config = this._cache.get(key);
		if (!config && this.parent) {
			return this.parent.retrieve(key);
		}
		return config.provide();
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
		}
		//todo: error if it's already registered?
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

