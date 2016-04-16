'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

// This regex detects the arguments portion of a function definition
// Thanks to Angular for the regex
var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
var ERROR_PREFIX = '[Trowel]';

var Context = (function () {
	function Context(module, parent) {
		_classCallCheck(this, Context);

		if (!parent && module instanceof Context) {
			parent = module;
			module = parent.module;
		}
		this.module = module;
		this.parent = parent;
		this._cache = new Map();
		this.providers = new Map();
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = Context.providers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var _step$value = _slicedToArray(_step.value, 2);

				var name = _step$value[0];
				var create = _step$value[1];

				this.providers.set(name, create(this));
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

	_createClass(Context, [{
		key: 'wire',
		value: function wire(subject) {
			var _this = this;

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
							_this._cache.set(key, { provide: provide, subject: subject });
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

			return { as: as };
		}
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
	}, {
		key: 'release',
		value: function release(key) {
			this._cache.delete(key);
		}
	}, {
		key: 'resolve',
		value: function resolve(subject) {
			return this.using(this.parent || {}).resolve(subject);
		}
	}, {
		key: 'using',
		value: function using(contextOrMap) {
			var context = this;
			if (_lodash2.default.isArray(contextOrMap) || !_lodash2.default.isObject(contextOrMap) && !Context.isContext(contextOrMap)) {
				throw new Error(ERROR_PREFIX + ' Cannot use anything else but an object or Context \n\t\t\t\tto override dependency resolutions');
			} else if (_lodash2.default.isFunction(contextOrMap)) {
				//functions are objects too, i.e. won't branch into "if"
				contextOrMap = this.resolve(contextOrMap);
			}
			return {
				resolve: function resolve(subject) {
					if (!_lodash2.default.isFunction(subject)) {
						throw new Error('{ERROR_PREFIX} Cannot resolve anything else but a function');
					}
					var dependencies = Context.getDependencies(subject);
					var resolved = undefined;
					if (Context.isContext(contextOrMap)) {
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
					return subject.apply(undefined, _toConsumableArray(resolved));
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
				if (_lodash2.default.get(config.subject, "__mortar_wrapped", false)) {
					config.subject = config.subject();
				}
				value = config.provide(config.subject);
			}
			if (typeof value === 'undefined') {
				throw new Error(ERROR_PREFIX + ' wiring not found for key \'' + key + '\'');
			}
			return value;
		}
	}, {
		key: 'retrieve',
		value: function retrieve(key) {
			return this._retrieveWithFallback(key, this.parent);
		}
	}, {
		key: 'has',
		value: function has(key) {
			return this._cache.has(key);
		}
	}, {
		key: 'spawn',
		value: function spawn() {
			return Context.create(this);
		}
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
	}, {
		key: 'create',
		value: function create() {
			var parent = arguments.length <= 0 || arguments[0] === undefined ? undefined : arguments[0];

			return new Context(parent);
		}
	}, {
		key: 'isContext',
		value: function isContext(subject) {
			return subject instanceof Context;
		}
	}, {
		key: 'register',
		value: function register(provider) {
			if (!Context.providers) {
				Context.providers = new Map();
			} else if (Context.providers.has(provider.name)) {
				throw new Error(ERROR_PREFIX + ' provider already registered for \'' + provider.name + '\'');
			}
			Context.providers.set(provider.name, provider.create || provider);
			return Context;
		}
	}]);

	return Context;
})();

exports.default = Context;

Context.register(function singleton(context) {
	return function getOrCreateInstance(factory) {
		if (typeof this.instance === 'undefined') {
			this.instance = context.resolve(factory);
		}
		return this.instance;
	};
}).register(function value() /*context*/{
	return function (value) {
		return value;
	};
}).register(function producer(context) {
	return function (factory) {
		return context.resolve(factory);
	};
});
