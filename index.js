'use strict';

// This regex detects the arguments portion of a function definition
// Thanks to Angular for the regex
var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;

function getDependencies(subject) {
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

function Context(parent) {
	this._cache = {};
	this.parent = parent;
}

function isContext(subject) {
	return subject instanceof Context;
}

function spawn(parent) {
	if (typeof parent === 'undefined' && this.parent) {
		parent = this.parent;
	}
	return new Context(parent);
}

Context.prototype = {

	wire: function(subject) {
		var self = this;
		return {
			as: {
				producer : function(name) {
					//todo: check subject is function
					self._cache[name] = {
						factory: subject,
						value  : null,
						type   : 'producer'
					};
					return self;
				},
				singleton: function(name) {
					//todo: check subject is function
					self._cache[name] = {
						factory: subject,
						value  : null,
						type   : 'singleton'
					};
					return self;
				},
				value    : function(name) {
					self._cache[name] = {
						value: subject,
						type : 'value'
					};
					return self;
				}
			}
		};
	},

	resolve: function(subject) {
		//todo: check subject's a function
		var self = this;
		var dependencies = getDependencies(subject);
		var resolved = dependencies.map(function(dependency) {
			return self.retrieve(dependency); //todo: throw error if not found
		});
		return subject.apply(null, resolved);
	},

	using: function(contextOrMap) {
		var self;
		return {
			resolve: function(subject) {
				if (isContext(contextOrMap)) {
					return contextOrMap.resolve(subject);
				}
				var dependencies = getDependencies(subject);
				var resolved = dependencies.map(function(dependency) {
					var value = contextOrMap[dependency];
					if (typeof value === 'undefined') {
						value = self.retrieve(dependency);
					}
					//todo: throw error if not found
					return value;
				});
				return subject.apply(null, resolved);
			}
		};
	},

	retrieve: function(name) {
		//todo: not found errror
		var config = this._cache[name];
		switch (config.type) {
			case 'value':
				return config.value;
			case 'singleton':
				if (config.value) {
					return config.value;
				}
				return config.value = this.resolve(config.factory);
			case 'producer':
				return this.resolve(config.factory);
			//todo: default error
		}
	},

	spawn: function() {
		return spawn(this);
	}
};

module.exports = spawn;
