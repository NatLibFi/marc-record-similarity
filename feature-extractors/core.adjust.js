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