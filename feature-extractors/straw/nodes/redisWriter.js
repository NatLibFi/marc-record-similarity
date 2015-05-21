"use strict";

var sprintf = require('sprintf').sprintf;
var straw = require('straw');
var redis = require("redis");
var client = redis.createClient();

module.exports = straw.node({

	process: function(msg, done) {
		var self = this;
		var key = this.generateKey(msg);
		client.set(key, msg, function(err, msg) {
			if (err) {
				return done(err);
			}
			self.output(msg, done);

		});

	},
	generateKey: function(msg) {

		var cols = msg.split("\t");
		return this.opts.config.prefix + cols[0];
	}

});
