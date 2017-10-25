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

"use strict";

var straw = require('straw');
var config = require('./config');
var sprintf = require('sprintf').sprintf;
var os = require('os');

var opts = {
	nodes_dir: __dirname + '/nodes',
	redis: {
		host: '127.0.0.1',
		port: 6379,
		prefix: 'straw-marc-deduplication'
	}
};

var topo = straw.create(opts);

var nodes = [
/*
{
	id: 'pairProvider',
	node: 'pairProvider',
	output:'check-cache',
	config: config.pairProvider
},
{
	id: 'cacheReader',
	node: 'mongoReader',
	input: 'check-cache',
	outputs: {'miss': 'pair-out', 'hit': 'similarity-vector-out'},
	config: config.mongoCache
},
*/
{
	id: 'comparisonResultParse',
	node: 'comparisonResultParse',
	input: 'comparison-out',
	output: ['similarity-vector-out'] //, 'to-cache']
},
/*
{
	id: 'splitter',
	node: 'noop',
	input: 'similarity-vector-out',
	output: ['result', 'throughput']
},
{
	id: 'throughput',
	node: 'speed',
	input: 'throughput'
},
{
	id: 'fileWriter',
	node: 'fileWriter',
	input: 'result',
	config: config.fileWriter
},
/*
{
	id: 'cacheWriter',
	node: 'mongoWriter',
	input: 'to-cache',
	config: config.mongoCache
}
*/
];

if (process.env.NODE_ENV == 'test') {
	nodes.push(
	{ // worker-node for testing
		id: sprintf('similarity-%s-%d', os.hostname(), 1),
		node: 'similarity',
		input: 'pair-out',
		output: 'comparison-out',
		config: config.recordProvider
	});
}

topo.add(nodes, function() {
	topo.purge();
	topo.start();
});

var stats = function() {
	topo.stats(function(err, data) {

		console.log(new Date());

		// stats.nodes show input/output counts
		// stats.pipes show unprocessed messages in pipe
		console.log('stats');
		console.log(data.nodes);

		console.log(data.pipes);

//		console.log('inspect');
//		console.log(topo.inspect());
	});
};

var interval = setInterval(stats, 5000);

process.on('SIGINT', function() {
	clearInterval(interval);
	topo.destroy(function() {
		console.log('Finished.');
	});
});
