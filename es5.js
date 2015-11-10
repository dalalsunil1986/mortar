'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// This regex detects the arguments portion of a function definition
// Thanks to Angular for the regex

var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;

var Context = (function () {
	function Context() {
		var parent = arguments.length <= 0 || arguments[0] === undefined ? undefined : arguments[0];

		_classCallCheck(this, Context);

		if (!Context.isContext(this)) {
			return Context.create(parent);
		}
		this._cache = new Map();
		this.parent = parent;
		this.providers = {};
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = Context.providers[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var _step$value = _slicedToArray(_step.value, 2);

				var name = _step$value[0];
				var create = _step$value[1];

				this.providers[name] = create(this);
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
				var _loop = function _loop() {
					var _step2$value = _slicedToArray(_step2.value, 2);

					var name = _step2$value[0];
					var configure = _step2$value[1];

					as[name] = function (key) {
						//todo throw error if already registered
						_this._cache.set(key, configure(subject));
					};
				};

				for (var _iterator2 = this.providers[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					_loop();
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
		key: 'resolve',
		value: function resolve(subject) {
			var _this2 = this;

			//todo: check subject's a function
			var dependencies = Context.getDependencies(subject);
			//todo: throw error if not found
			var resolved = dependencies.map(function (dependency) {
				return _this2.retrieve(dependency);
			});
			return subject.apply(undefined, _toConsumableArray(resolved));
		}
	}, {
		key: 'using',
		value: function using(contextOrMap) {
			var context = this;
			return {
				resolve: function resolve(subject) {
					if (Context.isContext(contextOrMap)) {
						return contextOrMap.resolve(subject);
					}
					var dependencies = Context.getDependencies(subject);
					var resolved = dependencies.map(function (dependency) {
						var value = contextOrMap[dependency];
						if (typeof value === 'undefined') {
							value = context.retrieve(dependency);
						}
						//todo: throw error if not found
						return value;
					});
					return subject.apply(undefined, _toConsumableArray(resolved));
				}
			};
		}
	}, {
		key: 'retrieve',
		value: function retrieve(key) {
			//todo: not found errror
			var config = this._cache.get(key);
			return config.provide();
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
			return Function.toString.call(subject).match(FN_ARGS)[1].split(',').map(function (i) {
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
				Context.providers = {};
			}
			//todo: error if it's already registered?
			Context.providers[provider.name] = provider.create;
			return Context;
		}
	}]);

	return Context;
})();

Context.register({
	name: 'singleton',
	create: function create(context) {
		return function (factory) {
			//todo: check subject is function
			return {
				instance: null,
				provide: function provide() {
					return typeof undefined.instance !== 'undefined' ? undefined.instance : undefined.instance = context.resolve(factory);
				}
			};
		};
	}
}).register({
	name: 'value',
	create: function create() {
		return function (value) {
			return { provide: function provide() {
					return value;
				} };
		};
	}
}).register({
	name: 'producer',
	create: function create(context) {
		return function (factory) {
			return { provide: function provide() {
					return context.resolve(factory);
				} };
		};
	}
});

module.exports = Context;
