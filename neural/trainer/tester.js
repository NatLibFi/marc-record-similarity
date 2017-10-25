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