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
		var key = this.generateKey(msg);

		this.save(key, msg)
		.then(function(response) {
			self.output(response);
		}).catch(function(e) {
			if (e.code == 11000) {
				console.log(e.err);
			} else {
				console.error(e);
			}
		}).done(function() {
			done();
		});

	},
	generateKey: function(msg) {
		if (msg[0] > msg[1]) {
			var tmp = msg[1];
			msg[1] = msg[0];
			msg[0] = tmp;
		}
		var cols = msg.split("\t");
		return cols[0];
	},

	save: function(key, msg) {
		
		var collection = this.db.collection(this.opts.config.collection);

		var doc = {
			_id: key,
			vector: msg
		};
		return Q.nfcall(collection.insert.bind(collection), doc);
	}
});
