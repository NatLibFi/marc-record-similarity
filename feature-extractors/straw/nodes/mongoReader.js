"use strict";

var sprintf = require('sprintf').sprintf;
var straw = require('straw');
var MongoClient = require('mongodb').MongoClient;
var Q = require('q');

module.exports = straw.node({

	initialize: function(opts, done) {
		var self = this;
		var url = this.opts.config.connectionUrl;

		MongoClient.connect(url, function(err, db) {
			if (err) {
				throw err;
			}
			console.log("Connected to Mongodb");
			self.db = db;
			done(false);
		});
	},

	process: function(msg, done) {
		var self = this;
		
		var key = this.generateKeyFromPair(msg);

		this.load(key)
		.then(function(res) {
			if (res === null) {
				self.output('miss', msg);
			} else {
				self.output('hit', res.vector);
			}
		}).catch(this.displayError)
		.done(function() {
			self.output(msg, done);
		});
	},
	displayError: function(err) {
		console.error(err);
	},

	load: function(key) {
		var collection = this.db.collection(this.opts.config.collection);

		return Q.nfcall(collection.findOne.bind(collection), {_id: key });
	},

	generateKeyFromPair: function(msg) {
		if (msg[0] > msg[1]) {
			var tmp = msg[1];
			msg[1] = msg[0];
			msg[0] = tmp;
		}
		return msg.join(" ");
	}

});
