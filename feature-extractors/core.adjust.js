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
// these functions will return weight adjustment for similarity value (which is always between [0,1])
// the returned value is always between [0,1]


function constant(x) {
	return 1;
}

function linearIncrease(x) {
	return x;
}

function linearDecrease(x) {
	return 1 - linearIncrease(x);
}

function quadraticIncrease(x) {
	return x*x;
}

function quadraticDecrease(x) {
	return 1 - quadraticIncrease(x);
}

module.exports = {
	constant: constant,
	linearIncrease: linearIncrease,
	linearDecrease: linearDecrease,
	quadraticIncrease: quadraticIncrease,
	quadraticDecrease: quadraticDecrease,
	co: constant,
	li: linearIncrease,
	ld: linearDecrease,
	qi: quadraticIncrease,
	qd: quadraticDecrease
};