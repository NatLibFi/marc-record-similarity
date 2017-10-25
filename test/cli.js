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
	network: network,
	verbose: displayOptions.verbose
});

Q.all([
	client.loadRecord(options["<record1>"]),
	client.loadRecord(options["<record2>"])
]).then(function(records) {

	var res = similarity.check(records[0], records[1]);

	console.log( sprintf("%.15f", res));
}).done();

