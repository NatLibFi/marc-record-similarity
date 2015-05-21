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
