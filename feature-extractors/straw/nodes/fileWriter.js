"use strict";

var sprintf = require('sprintf').sprintf;
var straw = require('straw');
var printer = require('../../core.print');
var fs = require('fs');

module.exports = straw.node({

	headerIsPrinted: false,
	
	initialize: function(opts, done) {
		var outFile = this.opts.config.outputFile;

		if (fs.existsSync(outFile)) {

			fs.unlink(outFile, done);

		} else {

			done(false);

		}
	},
	
	start: function(done) {
		console.log("Output goes to: " + this.opts.config.outputFile);
	},

	process: function(msg, done) {
		

		fs.appendFileSync(this.opts.config.outputFile, msg + "\n");
		
		this.output(msg, done);
		
	}

});
