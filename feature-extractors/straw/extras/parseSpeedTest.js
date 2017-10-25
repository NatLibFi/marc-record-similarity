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
/*jshint node:true*/
"use strict";

var Q = require('q');
var xml2js = require('xml2js');
var sprintf = require('sprintf').sprintf;
var fs = require('fs');
var byline = require('byline');
var Benchmark = require('benchmark');

var opts = {
	config: {
		fromDirectory: "/home/pt/melinda/data/xml"
	},
	input: "/home/pt/dev/deduplication/test.txt"
};


var all = [];
var input = byline.createStream( fs.createReadStream(opts.input));
input.on('data', function(data) {
	var line = data.toString();

	var ids = line.split("\t");
	ids.forEach(function(id) {
		all.push(id);
	});
	
});

input.on('end', function() {
	console.log("Testing");

var suite = new Benchmark.Suite;

var singleTestItem = loadData(all[Math.floor(Math.random() * all.length)]);
// add tests
suite.add('Load', function() {

	loadData(all[Math.floor(Math.random() * all.length)]);
});
suite.add('Parse', function() {

	parse( singleTestItem );
});
suite.add('LoadAndParse', function() {

	parse(loadData(all[Math.floor(Math.random() * all.length)]));

})
.on('cycle', function(event) {
  console.log(String(event.target));
})
.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})

.run();
});

function loadData(id1) {
	var data = dataProvider(id1);
	return data;
}
function parse(data) {

	var parsed = xml2js.parseString(data);

}


var dataProvider = function(id) {

	var file = sprintf("%s/%s.xml", opts.config.fromDirectory, id);

	return fs.readFileSync(file, 'utf8');

};
