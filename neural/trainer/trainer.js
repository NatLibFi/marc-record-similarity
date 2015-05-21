/*jshint node:true */
"use strict";
var brain = require('brain');
var fs = require('fs');
var data = require('./dataprovider');
var program = require('commander');
var sprintf = require('sprintf').sprintf;

var net = new brain.NeuralNetwork({
	
});


program
	.version('0.0.1')
	.option('-n, --non_duplicates <amount>', 'Train with n non-duplicates')
	.option('-d, --duplicates <amount>', 'Train with n duplicates')
	.option('-b, --brain <file>', 'Use existing network as a base for training')
	.parse(process.argv);

if (program.brain !== undefined) {
	var networkJSON = fs.readFileSync(program.brain, 'utf8');
	net.fromJSON( JSON.parse(networkJSON) );
}

var duplicates_amount = program.duplicates;
var nonduplicates_amount = program.non_duplicates;

var trainNondoulbes = data.non_doubles.slice(0, nonduplicates_amount);
var trainDoubles = data.doubles.slice(0, duplicates_amount);

var trainingData = trainNondoulbes.concat(trainDoubles);
shuffleArray(trainingData);

var result = net.train(trainingData, {
	errorThresh: 0.005,	// error threshold to reach
	iterations: 3000,	 // maximum training iterations
	log: true,					 // console.log() progress periodically
	logPeriod: 10,			 // number of iterations between logging
	learningRate: 0.6		// learning rate
});

console.log(result);

var json = net.toJSON();

var filename = sprintf("../networks/n%s-%s%s.json", duplicates_amount, nonduplicates_amount, program.brain !== undefined ? "-inc" : "");

fs.writeFileSync(filename, JSON.stringify(json), 'utf8');
console.log("Wrote network into %s", filename);
function shuffleArray(array) {
	for (var i = array.length - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
	return array;
}
