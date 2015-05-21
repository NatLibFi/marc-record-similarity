"use strict";

var sprintf = require('sprintf').sprintf;
var straw = require('straw');
var redis = require("redis");
var client = redis.createClient();

module.exports = straw.node({

	process: function(msg, done) {
		var self = this;
		
		var key = this.generateKeyFromPair(msg);

		client.get(key, function(err, res) {
			if (res === null) {
				self.output('miss', msg, done);
			} else {
				self.output('hit', res, done);
			}
			self.output(false, msg);
		});
		
	},
	generateKeyFromPair: function(msg) {
		return this.opts.config.prefix + msg.join(" ");
	}

});
