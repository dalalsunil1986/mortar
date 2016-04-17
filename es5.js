'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.isContext = isContext;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _isClass = require('is-class');

var _isClass2 = _interopRequireDefault(_isClass);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

// This regex detects the arguments portion of a function definition
// Thanks to Angular for the regex
var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
var ERROR_PREFIX = '[Trowel]';

/**
 * Mortar Context
 */

var Context = (function () {
	/**
  *
  * @param {Object} [module] node module
  * @param {Context} [parent] parent context
  */

	function Context(module, parent) {
		_classCallCheck(this, Context);

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
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = Context.providers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var _step$value = _slicedToArray(_step.value, 2);

				var name = _step$value[0];
				var configure = _step$value[1];

				this.providers.set(name, configure(this));
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator.return) {
					_iterator.return();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
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

	_createClass(Context, [{
		key: 'wire',
		value: function wire(subject) {
			var _this = this;

			var constructable = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

			var as = {};
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = this.providers[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var _step2$value = _slicedToArray(_step2.value, 2);

					var name = _step2$value[0];
					var provide = _step2$value[1];

					as[name] = (function (provide, name) {
						return function (key) {
							if (typeof subject === 'undefined') {
								throw new Error(ERROR_PREFIX + ' Cannot wire \'undefined\' as a ' + name);
							}
							if (_this.has(key)) {
								throw new Error(ERROR_PREFIX + ' Wiring already exists for key \'' + key + '\'');
							} else if (!_lodash2.default.isString(key) || key === '') {
								throw new Error(ERROR_PREFIX + ' Cannot use ' + key + ' as a key for wiring');
							}
							_this._cache.set(key, { subject: subject, provide: provide, constructable: constructable });
							return _this;
						};
					})(provide, name);
				}
			} catch (err) {
				_didIteratorError2 = true;
				_iteratorError2 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion2 && _iterator2.return) {
						_iterator2.return();
					}
				} finally {
					if (_didIteratorError2) {
						throw _iteratorError2;
					}
				}
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

	}, {
		key: 'require',
		value: function require(id) {
			var _this2 = this;

			if (!this.module) {
				throw new Error(ERROR_PREFIX + ' Cannot require without providing a module to the constructor');
			}
			var wrapped = function wrapped() {
				return _this2.module.require(id);
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

	}, {
		key: 'release',
		value: function release(key) {
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

	}, {
		key: 'resolve',
		value: function resolve(subject) {
			var constructable = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

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

	}, {
		key: 'using',
		value: function using(contextOrMap) {
			var context = this;
			if (_lodash2.default.isArray(contextOrMap) || !_lodash2.default.isObject(contextOrMap) && !isContext(contextOrMap)) {
				throw new Error(ERROR_PREFIX + ' Cannot use anything else but an object or Context \n\t\t\t\tto override dependency resolutions');
			} else if (_lodash2.default.isFunction(contextOrMap)) {
				//functions are objects too, i.e. won't branch into "if"
				contextOrMap = this.resolve(contextOrMap);
			}
			return {
				resolve: function resolve(subject) {
					var constructable = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

					if (!_lodash2.default.isFunction(subject)) {
						throw new Error('{ERROR_PREFIX} Cannot resolve anything else but a function');
					}
					var dependencies = Context.getDependencies(subject);
					var resolved = undefined;
					if (isContext(contextOrMap)) {
						resolved = dependencies.map(function (dependency) {
							return contextOrMap._retrieveWithFallback(dependency, context);
						});
					} else {
						resolved = dependencies.map(function (dependency) {
							var value = contextOrMap[dependency];
							if (typeof value === 'undefined') {
								value = context.retrieve(dependency);
							}
							return value;
						});
					}
					return constructable || (0, _isClass2.default)(subject) ? new (Function.prototype.bind.apply(subject, [null].concat(_toConsumableArray(resolved))))() : subject.apply(undefined, _toConsumableArray(resolved));
				}
			};
		}
	}, {
		key: '_retrieveWithFallback',
		value: function _retrieveWithFallback(key, fallback) {
			var config = this._cache.get(key);
			var value = undefined;
			if (!config) {
				if (fallback) {
					value = fallback.retrieve(key);
				}
			} else {
				if (_lodash2.default.get(config.subject, '__mortar_wrapped', false)) {
					config.subject = config.subject();
				}
				value = config.provide(config.subject, config.constructable);
			}
			if (typeof value === 'undefined') {
				throw new Error(ERROR_PREFIX + ' wiring not found for key \'' + key + '\'');
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

	}, {
		key: 'retrieve',
		value: function retrieve(key) {
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

	}, {
		key: 'has',
		value: function has(key) {
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

	}, {
		key: 'spawn',
		value: function spawn() {
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

	}], [{
		key: 'getDependencies',
		value: function getDependencies(subject) {
			if (!_lodash2.default.isFunction(subject)) {
				throw new Error(ERROR_PREFIX + ' cannot retrieve dependencies of anything else but a function');
			}
			return Function.prototype.toString.call(subject).match(FN_ARGS)[1].split(',').map(function (i) {
				return i.trim();
			}).filter(function (i) {
				return i;
			});
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

	}, {
		key: 'create',
		value: function create(module, parent) {
			return new Context(module, parent);
		}

		/**
   * Registers a provider to all instances. Either provide a named function, or an object with `name` and `configure` propterties
   * @param {Function|Object} provider
   * @param {!String} provider.name
   * @param {Function} provider.configure
   * @returns {Context}
   */

	}, {
		key: 'register',
		value: function register(provider) {
			if (!Context.providers) {
				Context.providers = new Map();
			} else if (Context.providers.has(provider.name)) {
				throw new Error(ERROR_PREFIX + ' provider already registered for \'' + provider.name + '\'');
			}
			Context.providers.set(provider.name, provider.configure || provider);
			return Context;
		}
	}]);

	return Context;
})();

/**
 * Wrapper for 
 * ```js
 * subject instanceof Context
 * ```
 * @param {*} subject
 * @returns {boolean}
 */

exports.default = Context;
function isContext(subject) {
	return subject instanceof Context;
}

Context.register(function singleton(context) {
	return function getOrCreateInstance(factory) {
		var constructable = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

		if (typeof this.instance === 'undefined') {
			this.instance = context.resolve(factory, constructable);
		}
		return this.instance;
	};
}).register(function value() /*context*/{
	return function (value) {
		return value;
	};
}).register(function producer(context) {
	return function (factory) {
		var constructable = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];
		return context.resolve(factory, constructable);
	};
});
