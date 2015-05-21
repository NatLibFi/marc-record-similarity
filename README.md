marc-record-similarity

var RecordSimilarity = require('marc-record-similarity');


var similarityChecker = new RecordSimilarity(options);

options:
	network: brain.NeuralNetwork (see brain)
	strategy: strategy (attributes) used to train the network


var similarity = new RecordSimilarity({
	strategy: strategy,
	network: network
});

var res = similarity.check(records[0], records[1]);

res will be in the range [0,1].

