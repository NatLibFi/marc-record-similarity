/*jshint node:true */
"use strict";
var brain = require('brain');
var fs = require('fs');
var sprintf = require('sprintf').sprintf;

var net = new brain.NeuralNetwork();
var data = require('./dataprovider');

var program = require('commander');

program
  .version('0.0.1')
  .option('-n, --network <file>', 'JSON file to load trained network from')
  .option('-c, --count <amount>', 'Test with how many records')
  .parse(process.argv);

console.log(program.network);
if (program.network === undefined) {
	program.help();
}

var networkJSON = fs.readFileSync(program.network, 'utf8');
net.fromJSON( JSON.parse(networkJSON) );


var TARGET = {
	SAME: 1,
	DIFF: 0
};

var correct = 0;
var incorrect = 0;
var testCount = program.count || 200;



for (var i=0;i<testCount;i++) {
	runTest();
}
console.log( correct, incorrect );


function runTest() {
	var r, idx, doc;
	var rand = Math.random();

	if (rand > 0.5) {
		if (data.doubles.length === 0) {
			return;
		}

		r = Math.random();
		idx = Math.floor(r*data.doubles.length);
		
		doc = data.doubles.splice(idx,1)[0];

		testWith(doc, TARGET.SAME);

	} else {
		if (data.non_doubles.length === 0) {
			return;
		}
		

		r = Math.random();
		idx = Math.floor(r*data.non_doubles.length);

		doc = data.non_doubles.splice(idx,1)[0];
		testWith(doc, TARGET.DIFF);
	}

	function testWith(item, target) {
		var output = net.run(item.input);

		var uncertainty = 0.5 - Math.abs(0.5 - output[0]);
		//if (uncertainty > 0.1) return;
		
		var distance = Math.abs(target - output[0]);
		
		var ok = distance < 0.5;
		
		if (ok) {
			correct++;
		} else {
			incorrect++;
		}

		var action_taken = output[0] > 0.5 ? 'MERGE' : 'NO-OP';
		var action_correct = target === 1 ? 'MERGE' : 'NO-OP';

		var msg = sprintf("../diff.sh %s\t%.4f\t%.4f\t%s\t%s\t%s", item.key, distance, output[0], ok ? 'ok':'fail', action_taken, action_correct);

		var extra = sprintf("d(%.4f, %f) < %.4f", output[0], target, .5);

		console.log(sprintf("%s\t%s", msg, extra));
		
	}
}