/*jshint node:true*/
"use strict";

var sprintf = require('sprintf').sprintf;
var _ = require('underscore');
var normalizeFuncs = require('./core.normalize');


function displaySummary(comparison, displayOptions) {
	var summary = generateSummary(comparison, displayOptions);
	console.log(summary);
}

function generateSummary( comparison, displayOptions) {
	var msg = "";

	displayOptions = displayOptions || {};

	var results = comparison.results;

	var headers = _.pluck(results, 'name');
	var grouped = _.groupBy(results, 'name');

	var row = [parseId(comparison.record1) +" "+ parseId(comparison.record2)];
	headers.forEach(function(key) {
		var val = grouped[key][0].similarity;
		
		row.push( isNaN(val) || val === null ? "-" : val);
	});

	headers.unshift("\t");

	if (displayOptions.humanReadableSummary) {
		headers.shift();
		row.shift();

		msg += headers.map(spaced(8)).join(' ') + "\n";
		msg += row.map(spaced(8)).join(' ') + "\n";

	} 
	if (displayOptions.summary) {
		msg += headers.join("\t") + "\n";
		msg += row.join("\t") + "\n";

	}

	function spaced(num) {
		return function(str) {
			str = ""+str;
			return sprintf("%"+num+"s", str.substr(0,num));
		};
	}

	return msg;

}

function parseId(record) {
	var f001 = record.controlfield.filter(function(t) { return t.$.tag == "001"; });
	if (f001.length === 0) {
		return null;
	}
	return f001[0]._;
}

function displayRecords( comparison, displayOptions ) {


	var similarity = comparison.similarity;

	if ( displayOptions.verbose ) {
		if (similarity !== null && similarity >= displayOptions.displayOver && similarity <= displayOptions.displayUnder) {
			showRecords( comparison );
			
		}

		if (similarity === null && displayOptions.displaySkipped) {
			showRecords( comparison );
			
		}

	}


	function showRecords(comparison) {

		console.log(sprintf("\n##########################################"));
		console.log(sprintf("Matching ('%s', '%s') with [%s]", comparison.record1.filename, comparison.record2.filename, _(comparison.results).pluck('name').join(", ")));

		_(comparison.results).pluck('checker').forEach(function(checker) {
			console.log(sprintf("## %s ##", checker.name));

			console.log(sprintf("> node sim.js -v %s %s %s", checker.name, comparison.record1.filename, comparison.record2.filename));
			console.log(sprintf("> ../diff.sh %s %s", comparison.record1.filename, comparison.record2.filename));

			var data = checker.getData();

			var rec1Str = normalizeFuncs.fieldsToString( data.fields[0] );
			var rec2Str = normalizeFuncs.fieldsToString( data.fields[1] );
			
			var normalizedRec1Str = normalizeFuncs.fieldsToString( data.normalized[0] );
			var normalizedRec2Str = normalizeFuncs.fieldsToString( data.normalized[1] );

			var columnWidth = process.stdout.columns / 2;
			if (isNaN(columnWidth)) {
				columnWidth = 50;
			}

			rec1Str = comparison.record1.filename + "\n" + rec1Str;
			rec2Str = comparison.record2.filename + "\n" + rec2Str;
			

			var str2col = to2col(Math.floor(columnWidth), rec1Str, rec2Str);
			
			process.stdout.write(str2col);

			process.stdout.write("----Normalized----\n");

			var nstr2col = to2col(Math.floor(columnWidth), normalizedRec1Str, normalizedRec2Str);
			process.stdout.write(nstr2col);
			
			process.stdout.write("------------------\n");
			if (checker.similarity == null) {
				process.stdout.write(sprintf("[Skipped]\n\n"));
			} else {
				process.stdout.write(sprintf("[Similarity: %f][Weight: %f]\n\n", checker.similarity, checker.weight));
			}

		});
	}

}

function to2col(columnWidth, str1, str2) {
	str1 = str1.replace(/\n$/, "");
	str2 = str2.replace(/\n$/, "");

	var lines1 = str1.split("\n");
	var lines2 = str2.split("\n");

	var output = "";
	for (var i=0;i<Math.max(lines1.length, lines2.length); i++) {
		var line1 = lines1[i] || '';
		var line2 = lines2[i] || '';

		line1 = splitTo(line1, columnWidth-3);
		line2 = splitTo(line2, columnWidth-3);

		for (var j=0;j<Math.max(line1.length, line2.length); j++) {
			var l1 = line1[j] || '';
			var l2 = line2[j] || '';
			
			output += sprintf("%-"+columnWidth+"s | %s\n", l1, l2);
		}
		
	}

	return output;

}

function splitTo(str, width) {
	var out = [];
	while (str.length > width) {
		out.push(str.substr(0,width));
		str = "        " + str.substr(width);
	}
	out.push(str);

	return out;
}


module.exports = {
	displayRecords: displayRecords,
	displaySummary: displaySummary,
	generateSummary: generateSummary

};