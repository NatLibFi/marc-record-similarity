/**
*
* @licstart  The following is the entire license notice for the JavaScript code in this file.
*
* Checks the similarity of 2 marc records using neural network
*
* Copyright (C) 2015, 2017 University Of Helsinki (The National Library Of Finland)
*
* This file is part of marc-record-similarity
*
* marc-record-similarity program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Affero General Public License as
* published by the Free Software Foundation, either version 3 of the
* License, or (at your option) any later version.
*
* marc-record-similarity is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Affero General Public License for more details.
*
* You should have received a copy of the GNU Affero General Public License
* along with this program.  If not, see <http://www.gnu.org/licenses/>.
*
* @licend  The above is the entire license notice
* for the JavaScript code in this file.
*
*/
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
