/* jshint node:true */
"use strict";

var sprintf = require('sprintf').sprintf;
var straw = require('straw');
var fs = require('fs');
var byline = require('byline');

module.exports = straw.node({

	initialize: function(opts, done){
		done();
	},

	start: function(done) {

		var file = this.opts.config.file;
	
		var input = byline.createStream( fs.createReadStream(file, 'utf8') );
	
		input.on('data', this.parseLine.bind(this));
		
		done(false);

	},

	stop: function(done) {
		
		done(false);
	},

	parseLine: function(chunk) {
		var line = chunk.toString();
		var ids = line.split("\t");
		this.output(ids);
	}
});

