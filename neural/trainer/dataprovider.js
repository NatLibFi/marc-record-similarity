/*jshint node:true*/
"use strict";

var fs = require('fs');
var _ = require('underscore');

var strategy = require("../../stragies/default.strategy");
var attributes = _(strategy).pluck('name');

var elementCount = attributes.length;

//var nonDuplicates = fs.readFileSync('better_non_duplicate.vec', 'utf8');
var nonDuplicates = fs.readFileSync('non_duplicate.vec', 'utf8');
var duplicates = fs.readFileSync('duplicate.vec', 'utf8');

nonDuplicates = nonDuplicates.split("\n");
duplicates = duplicates.split("\n");

nonDuplicates = nonDuplicates.filter(hasNumElements(elementCount));
duplicates = duplicates.filter(hasNumElements(elementCount));

if (nonDuplicates.length === 0) {
	throw new Error("Couldnt find any data for non-duplcates");
}
if (duplicates.length === 0) {
	throw new Error("Couldnt find any data for duplcates");
}

nonDuplicates = nonDuplicates.map(parseLine(0));
duplicates = duplicates.map(parseLine(1));

function parseLine(target) {

	return function(line) {

		var itemKey = line.split("\t")[0];
		var testItem = line.split("\t").slice(1);

		var item = toTrainingData(target)(parseItem(testItem));
		item.key = itemKey;
		return item;
	};

}

function hasNumElements(num) {
	return function(line) {
		return line.split("\t").length === num;
	};
}
function parseItem(item) {

	var parsed = [];
	item.forEach(function(component) {
		if (isNaN(component)) {
			parsed.push(null);	
		} else {
			parsed.push( parseFloat(component) );
		}
	});
	return parsed;

}

function toTrainingData(target) {

	return function(item) {
		var ret = {
			input: {},
			output: [target],

		};

		attributes.forEach(function(key, i) {
			if (item[i] !== null) {
				ret.input[key] = item[i];
			}

		});
		return ret;

	};
}

module.exports = {
	non_doubles: nonDuplicates, 
	doubles:  duplicates
};
