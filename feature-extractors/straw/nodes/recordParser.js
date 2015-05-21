var sprintf = require('sprintf').sprintf;
var straw = require('straw');
var Similarity = require('../../similarity');
var xml2js = require('xml2js');
var strategyName = "all";

var strategy = require(sprintf('../../strategies/%s', strategyName));

module.exports = straw.node({

	process: function(msg, done) {

		this.output({
			record1: this.parseRecord(msg.record1),
			record2: this.parseRecord(msg.record2)
		}, done);

	},

	parseRecord: function(recordXML) {

		var recordJSON = xml2js.parseString(recordXML);
		return recordJSON.collection.record[0];
	
	},


});




