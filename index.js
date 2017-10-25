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

var Similarity = require('./feature-extractors/similarity');
var brain = require('brain');


function constructor(options) {

	var net = new brain.NeuralNetwork();

	net.fromJSON(options.network);

	function check(record1, record2) {

		var featureVector = generateFeatureVector(record1, record2);
		if (options.verbose) {
			console.log(featureVector);
		}
		var similarity = net.run(featureVector);

		return similarity[0];


	}

	function generateFeatureVector(record1, record2) {

		var similarity = new Similarity(options.strategy, {
			displayUnder: 1,
			displayOver: -2, 
			displaySkipped: true
		} );
		
		record1 = toxmljsFormat(record1);
		record2 = toxmljsFormat(record2);

		var comparison = similarity.compareRecords(record1, record2);


		return comparison.results.reduce(function(memo, item) {
			memo[item.checker.name] = item.checker.similarity;
			return memo;
		}, {});
	}

	function toxmljsFormat(marcRecord) {

		var xmljsFormat = {
			controlfield: marcRecord.getControlfields().map(controlfieldFormatter),
			datafield: marcRecord.getDatafields().map(datafieldFormatter)
		};

		return xmljsFormat;

		function controlfieldFormatter(field) {
			
			return {
				$: {
					tag: field.tag
				},
				_: field.value
			};
		}
		function datafieldFormatter(field) {
		
			return {
				$: {
					tag: field.tag,
					ind1: field.ind1,
					ind2: field.ind2
				},
				subfield: field.subfields.map(subfieldFormatter)
			};
		}

		function subfieldFormatter(subfield) {
			return {
				$: {
					code: subfield.code,
				},
				_: subfield.value
			};
		}
	}
	
	return {
		check: check
	};


}

module.exports = constructor;
