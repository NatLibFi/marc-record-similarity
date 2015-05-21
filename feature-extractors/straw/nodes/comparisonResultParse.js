var sprintf = require('sprintf').sprintf;
var straw = require('straw');
var printer = require('../../core.print');
var fs = require('fs');

module.exports = straw.node({

	process: function(msg, done) {
		var comparison = msg;
		
		var summary = printer.generateSummary(comparison, {summary: true});
		var lines = summary.split("\n");

		this.output(lines[1], done);
		
	}

});