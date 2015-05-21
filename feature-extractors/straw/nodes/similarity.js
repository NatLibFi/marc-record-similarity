"use strict";

var sprintf = require('sprintf').sprintf;
var straw = require('straw');
var Similarity = require('../../similarity');
var xml2js = require('xml2js');
var strategyName = "all";
var Q = require('q');
var fs = require('fs');
var http = require('http');

var strategy = require(sprintf('../../strategies/%s', strategyName));

module.exports = straw.node({

	process: function(msg, done) {
		var loadRecord;
		if (this.opts.config.useProvider == 'fs') {
			loadRecord = this.fsDataProvider.bind(this);
		} else if (this.opts.config.useProvider == 'fs-multidir') {
			loadRecord = this.fsDataMultidirProvider.bind(this);	
		} else if (this.opts.config.useProvider == 'http') {
			loadRecord = this.httpDataProvider.bind(this);			
		} else {
			throw new Error("Unknown data provider: " + this.opts.config.useProvider);
		}

		var self = this;

		var id1 = msg[0];
		var id2 = msg[1];

		Q.all([
			loadRecord(id1),
			loadRecord(id2)
		]).then(function(res) {
			var msg = {
				record1: res[0],
				record2: res[1]
			};
			
			Q.all([
				Q.nfcall(self.parseRecord, msg.record1),
				Q.nfcall(self.parseRecord, msg.record2)
			]).then(function(records) {

				var similarity = new Similarity(strategy, {
					displayUnder: 1,
					displayOver: -100,
					displaySkipped: false
				});

				similarity.setVerbose(false);
				try {
					var comparison = similarity.compareRecords(records[0], records[1]);
					self.output(comparison, done);
				} catch(e) {
					process.stderr.write(sprintf("Error comparing records %s %s\n", id1, id2));
					process.stderr.write(e.message);
					process.stderr.write(e.stack);

					done(false);
				}

			}).done();

		})
		.catch(function(error) {
			process.stderr.write(error.message);
			done();
		}).done();
	
	},

	parseRecord: function(recordXML, cb) {

		xml2js.parseString(recordXML, function(err, result) {
			if (err) {
				cb(err);
			}

			var rec = result.collection.record[0];
			return cb(null, rec);

		});

	},

	fsDataMultidirProvider: function(id) {
		var deferred = Q.defer();
		var group = id.substring(0,3);

		var file = sprintf("%s/%s/%s.xml", this.opts.config.fromDirectory, group, id);
		
		fs.readFile(file, 'utf8', function(err, res) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(res);
			}
		});
		return deferred.promise;

	},

	fsDataProvider: function(id) {
		var deferred = Q.defer();
		var file = sprintf("%s/%s.xml", this.opts.config.fromDirectory, id);
		
		fs.readFile(file, 'utf8', function(err, res) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(res);
			}
		});
		return deferred.promise;
	},

	httpDataProvider: function(id) {

		var deferred = Q.defer();
		var url = sprintf("%s/%s.xml", this.opts.config.fromUrl, id);
		
		http.get(url, function(res) {

			if (res.code != 200) {
				return deferred.reject(res.code);
			}
			
			var data = "";
			res.on('data', function(chunk) {
				data += chunk;
			});
			res.on('end', function() {
				deferred.resolve(data);
			});

		}).on('error', deferred.reject);

		return deferred.promise;
	}

});
