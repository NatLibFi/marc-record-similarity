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
/* jshint node:true */
"use strict";

var sprintf = require('sprintf').sprintf;
var straw = require('straw');
var fs = require('fs');
var byline = require('byline');
var MongoClient = require('mongodb').MongoClient;
var Q = require('q');
var stream = require('stream');

var count = 0;
var start = new Date();
var counter = stream.Transform();
counter._transform = function(data, encoding, next) {
	count++;
	if (count % 1000 === 0) {
		var now = new Date();
		var diff = now - start;
	
		var timePerItem = Math.round(diff / count * 100) / 100;

		process.stderr.write(sprintf("Read %s items, time per item: %sms\n", count, timePerItem));
	}
	next(null, data);
};

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

	start: function(done) {

		var file = this.opts.config.file;
	
		var input = byline.createStream( fs.createReadStream(file, 'utf8') );

		var ws = stream.Writable();
		ws._write = this.parseLine.bind(this);
		
		console.log("Started to read pairs from ", file);
		input.pipe(counter).pipe(ws);
	
		done(false);

	},

	stop: function(done) {
		
		done(false);
	},

	parseLine: function(chunk, enc, next) {
		var self = this;
		var line = chunk.toString();
	
		var ids = line.split("\t");
		this.processPair(ids).done(function() {
			
			self.output("dummy-output");
			setTimeout(function() {
				next();
			}, 2);
		});
	},

	processPair: function(msg) {
	
		var self = this;
		
		var key = this.generateKeyFromPair(msg);

		return this.load(key)
		.then(function(res) {
			if (res === null) {
				self.output('miss', msg);
			} else {
				self.output('hit', res.vector);
			}
		}).catch(this.displayError);
		
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
