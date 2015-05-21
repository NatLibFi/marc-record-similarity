/* jshint node:true */
"use strict";

var fs = require('fs');
var docopt = require('docopt').docopt;
var Q = require('q');
var sprintf = require('sprintf').sprintf;
var MelindaClient = require('melinda-api-client');
var config = require('./config');

var SimilarityCheck = require('../index');

var doc = [
"Usage:",
"  similarity [-v] <check> <record1> <record2>",
"  similarity [-v] strategy <strategy> <record1> <record2>",
"  similarity -h | --help | --version",
""
].join("\n");

var options = docopt(doc, {version: 0.1});

var displayOptions = {
	displayUnder: 1,
	displayOver: -2, 
	displaySkipped: true,
	verbose: options['-v'] || false,
	humanReadableSummary: true
};


var strategy;
if (options["<strategy>"]) {
	strategy = require(sprintf('../strategies/%s', options["<strategy>"]));
} else {
	strategy = [{
		name: options['<check>'],
		weight: 1
	}];
}
	
var networkJSON = fs.readFileSync("../neural/networks/default.network.json", 'utf8');
var network =	JSON.parse(networkJSON);
var client = new MelindaClient(config);


var similarity = new SimilarityCheck({
	strategy: strategy,
	network: network
});

Q.all([
	client.loadRecord(options["<record1>"]),
	client.loadRecord(options["<record2>"])
]).then(function(records) {

	var res = similarity.check(records[0], records[1]);

	console.log( sprintf("%.15f", res));
}).done();

