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