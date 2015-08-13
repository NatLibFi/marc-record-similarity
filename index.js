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
