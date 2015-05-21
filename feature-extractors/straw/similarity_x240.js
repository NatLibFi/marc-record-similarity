
"use strict";

var straw = require('straw');
var config = require('./config');

var opts = {
	nodes_dir: __dirname + '/nodes',
	redis: {
		host: config.similarity_master_host,
		port: config.similarity_master_port, //default: 6379,
		prefix: 'straw-marc-deduplication'
	}
};

var topo = straw.create(opts);

var nodes = [
	{
		id: 'cachedPairProvider',
		node: 'cachedPairProvider',
		outputs: {'miss': 'pair-out', 'hit': 'to-file'},
		config: config.cachedPairProvider
	},

	{
		id: 'splitter',
		node: 'noop',
		input: 'similarity-vector-out',
		output: ['to-file', 'to-cache']
	},

	{
		id: 'fileWriter',
		node: 'fileWriter',
		input: 'to-file',
		output: ['throughput'],
		config: config.fileWriter
	},

	{
		id: 'throughput',
		node: 'speed',
		input: 'throughput'
	},

	{
		id: 'cacheWriter',
		node: 'mongoWriter',
		input: 'to-cache',
		config: config.mongoCache
	}

];

topo.add(nodes, function() {
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
