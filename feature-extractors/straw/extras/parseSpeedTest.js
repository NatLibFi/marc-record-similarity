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
