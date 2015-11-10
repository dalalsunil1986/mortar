// This regex detects the arguments portion of a function definition
// Thanks to Angular for the regex

const FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;

class Context {
	constructor(parent = undefined) {
		if (!Context.isContext(this)) {
			return Context.create(parent);
		}
		this._cache = new Map();
		this.parent = parent;
		this.providers = {};
		for (let [name, create] of Context.providers) {
			this.providers[name] = create(this);
		}
	}

	wire(subject) {
		let as = {};
		for (let [name, configure] of this.providers) {
			as[name] = key => {
				//todo throw error if already registered
				this._cache.set(key, configure(subject));
			};
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
				if (Context.isContext(contextOrMap)) {
					return contextOrMap.resolve(subject);
				}
				var dependencies = Context.getDependencies(subject);
				var resolved = dependencies.map(dependency => {
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
		const config = this._cache.get(key);
		return config.provide();
	}

	has(key) {
		return this._cache.has(key);
	}

	spawn() {
		return Context.create(this);
	}

	static getDependencies(subject) {
		return Function.toString.call(subject)
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
			Context.providers = {};
		}
		//todo: error if it's already registered?
		Context.providers[provider.name] = provider.create;
		return Context;
	}
}

Context
	.register({
		name  : 'singleton',
		create: context => {
			return factory => {
				//todo: check subject is function
				return {
					instance: null,
					provide : () => {
						return (typeof this.instance !== 'undefined')
							? this.instance
							: this.instance = context.resolve(factory);
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

module.exports = Context;
