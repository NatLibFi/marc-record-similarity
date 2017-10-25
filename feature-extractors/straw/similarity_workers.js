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

var straw = require('straw');
var config = require('./config');
var sprintf = require('sprintf').sprintf;
var os = require('os');
var fs = require('fs');

var logDir = __dirname + "/log";
if (!fs.existsSync(logDir)) {
	fs.mkdirSync(logDir);
}

var opts = {
	nodes_dir: __dirname + '/nodes',
	redis: {
		host: config.similarity_master_host,
		port: 6379,
		prefix: 'straw-marc-deduplication'
	}
};

if (process.env.NODE_ENV !== 'dev') {
	opts.log_f = {
		filename: sprintf("%s/worker-%s.log", logDir, os.hostname())
	};
}

var topo = straw.create(opts);

var nodeCount = config.workerNodeCount;

var nodes = [];
for (var i = 0;i < nodeCount; i++) {
	nodes.push({
		id: sprintf('similarity-%s-%d', os.hostname(), i),
		node: 'similarity',
		input: 'pair-out',
		output: 'comparison-out',
		config: config.recordProvider
	});
}

topo.add(nodes, function() {
	topo.start();
});

var interval;
process.on('SIGINT', function() {
	clearInterval(interval);
	topo.destroy(function() {
		console.log('Finished.');
	});
});

if (process.env.NODE_ENV == 'dev') {
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

	interval = setInterval(stats, 5000);
}
