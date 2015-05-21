/* jshint node:true */
"use strict";

var docopt = require('docopt').docopt;
var Q = require('q');
var xml2js = require('xml2js');
var fs = require('fs');
var Similarity = require('./similarity');
var sprintf = require('sprintf').sprintf;
var _ = require('underscore');
var print = require('./core.print');

var recordProvider = require('./recordprovider.aleph.js');

var DATA_DIR = "../data";

var doc = [
"Usage:",
"  batch [-v] [-s|-r] [-d] [--displayskipped] [--displayover] [--displayunder] <check-function> <file>",
"  batch [-v] [-s|-r] [-d] [--displayskipped] [--displayover] [--displayunder] strategy <strategy> <file>",
"  batch -h | --help | --version",
""
].join("\n");

var options = docopt(doc, {version: 0.1});
	
var VERBOSE = options['-v'];

var displayOptions = {
	displayUnder: options["--displayunder"] || 1,
	displayOver: options["--displayover"] || -100,
	displaySkipped: options["--displayskipped"],
	verbose: options['-v'] || false,
	summary: options['-s'] || false,
	humanReadableSummary: options['-r'] || false,
	debug: options['-d'] || false
};

var strategy;
if (options["<strategy>"]) {
	strategy = require(sprintf('../strategies/%s', options["<strategy>"]));
} else {
	strategy = [{
		name: options['<check-function>'],
		weight: 1
	}];
}

var pairs = fs.readFileSync(options["<file>"], 'utf8');
pairs = pairs.split("\n");

run(0);

var len = pairs.length;
function run(idx) {
	console.error(idx +" / " +len);
	if (pairs[idx] && pairs[idx].length) {

		var ids = pairs[idx].split("\t");

		var file1 = sprintf("%s/%s.xml", DATA_DIR, ids[0]);
		var file2 = sprintf("%s/%s.xml", DATA_DIR, ids[1]);

		compareFiles(file1, file2).then(function(comparison) {
			
			print.displayRecords(comparison, displayOptions);
			print.displaySummary(comparison, displayOptions);

			if (comparison.similarity === null) {
				process.stdout.write(sprintf("%s\t%s\t%s", ids[0], ids[1], "SKIP"));
			} else {
//				process.stdout.write(sprintf("%s\t%s\t%f", ids[0], ids[1], comparison.similarity));
			}

			if (displayOptions.debug) {
				process.stdout.write(sprintf("\t../diff.sh %s/%s.xml %s/%s.xml", DATA_DIR, ids[0], DATA_DIR, ids[1]));
				process.stdout.write(sprintf("\tnode sim strategy %s %s/%s.xml %s/%s.xml", options["<strategy>"], DATA_DIR, ids[0], DATA_DIR, ids[1]));
				
			}
			process.stdout.write("\n");

			
		}).catch(function(e) {
			console.error(e);
		}).done(function() {
			if (idx < pairs.length) {
				run(++idx);
			}
		});

	}

}

function totalSimilarity(comparison) {

	var results = comparison.results;

	var nonSkippedChecks = results.filter(function(res) { return res.similarity !== null; });
	var skippedChecks = results.filter(function(res) { return res.similarity === null; });

	var total = nonSkippedChecks.reduce(function(memo, result) { return memo + result.similarity * result.weight;}, 0);
	var weights = nonSkippedChecks.reduce(function(memo, result) { return memo + result.weight;}, 0);

	var similarity = total / weights;
	if (isNaN(similarity)) {
		similarity = null;
	}

	var hasNegatives = results.some(function(result) { return result.similarity < 0; });
	if (hasNegatives) {
		similarity = -1;
	}

	return similarity;
	
}

function dataProvider(file) {

	var id = file.replace(/\D/g, "");
	return recordProvider.getRecord(id);
	//return Q.nfcall(FS.readFile, file, "utf-8");

//	return fs.readFileSync(file, 'utf8');
}

function loadData(file) {
	var dataDeferred = Q.defer();

	dataProvider(file).then(function(data) {
		dataDeferred.resolve( Q.nfcall(xml2js.parseString, data) );
		
	}, function(error) {
		dataDeferred.reject(error);
	}).done();

	return dataDeferred.promise;
}

function compareFiles(file1, file2) {
	var defer = Q.defer();

	Q.all([
		loadData(file1),
		loadData(file2),
	]).then(function(res) {
		var record1;
		var record2;

		if (res[0].collection) {
			record1 = res[0].collection.record[0];
		} else {
			record1 = res[0].record;
		}

		if (res[1].collection) {
			record2 = res[1].collection.record[0];
		} else {
			record2 = res[1].record;
		}

		record1.filename = file1;
		record2.filename = file2;

		var similarity = new Similarity(strategy, {
			displayUnder: options["--displayunder"] || 1,
			displayOver: options["--displayover"] || -100,
			displaySkipped: options["--displayskipped"]
		});
		similarity.setVerbose(VERBOSE);
		
		try {
			var comparison = similarity.compareRecords(record1, record2);
			defer.resolve(comparison);
		} catch (e) {
			console.error(e);
			defer.resolve(null);
		}
	}).catch(function(error) {
		console.error(error);
		defer.reject(error);
	}).done();

	return defer.promise;
}

function isSeriesBib(record) {
	var isSeries = false;

	if (record.controlfield.some(function(field) { return (field._ == 'SE'); })) {
		return true;
	}

	var fieldsToCheck = record.datafield.filter(function(field) {
		return ["490", "830", "245"].indexOf(field.$.tag) !== -1;
	});
	fieldsToCheck.forEach(function(field) {

		if (field.$.tag == "490") {
			isSeries = true;
		}
		if (field.$.tag == "830") {
			isSeries = true;
		}
		if (field.$.tag == "245") {
			field.subfield.forEach(function(subfield) {
				if (['p', 'n'].indexOf(subfield.$.code) != -1) {
					isSeries = true;
				}
			});
		}
	});

	return isSeries;

}
