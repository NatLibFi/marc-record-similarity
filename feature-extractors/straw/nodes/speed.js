var sprintf = require('sprintf').sprintf;
var straw = require('straw');
var printer = require('../../core.print');
var fs = require('fs');

module.exports = straw.node({

	msgCount: 0,

	initialize: function(opts, done) {
	
		done(false);
	},
	start: function(done) {

		this.interval = setInterval(this.count.bind(this),1000);

	},
	stop: function(done) {
		clearInterval(this.interval);
	},
	process: function(msg, done) {
		
		this.msgCount++;
		this.output(msg, done);		
	},
	count: function() {
		console.log(this.msgCount);
		this.msgCount = 0;
	}

});