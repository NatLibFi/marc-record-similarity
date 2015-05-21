/*jshint node:true*/
"use strict";

var map245n_data = {
	"one": 1,
	"two": 2,
	"second": 2,
	"three": 3,
	"fourth": 4,
	"fifth": 5,

	"ensimmäinen": 1,
	"toinen": 2,
	"kolmas": 3,
	"neljäs": 4,
	"viides": 5,
	"kuudes": 6,
	"seitsemäs": 7,
	
	"första": 1,
	"andra": 2,
	"tredje": 3,
	"fjärde": 4,
	"femte": 5,
	"d.": "Del", //D is 500 in roman numbers so expand it

	"erster": 1,
};

function map245n(word) {
	return map245n_data[word.toLowerCase()] || word;
}

module.exports = {
	map245n: map245n
};