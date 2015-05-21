/* core similarity functions */


/*jshint node:true*/
"use strict";

var wuzzy = require('wuzzy');
var _ = require('underscore');


function stringEquals(string1, string2) {

	return (string1 === string2) ? 1 : 0;
}

function stringJaccard(string1, string2) {
	var set1 = string1.split('');
	var set2 = string2.split('');
	return wuzzy.jaccard(set1, set2);
}

function setCompare(set1, set2) {

	//?? halutaan testata 020 a kenttiä keskenään
	//
	return _.intersection(set1, set2).length > 0 ? 1 : 0;

}

function isIdentical(set1, set2, equalFunc) {
	return isSubset(set1, set2, equalFunc) && isSubset(set2, set1, equalFunc);
}

function isSubset(set1, set2, equalFunc) {
	if (equalFunc !== undefined) {
		var equalFuncOptions = equalFunc.options || {nosubcode: true};
		if (equalFuncOptions.noNormalization) {
			return setDifference(set1, set2, equalFunc).length === 0;
		} else {
			return setDifference(toString(set1, equalFuncOptions), toString(set2, equalFuncOptions), equalFunc).length === 0;
		}
	}
	return setDifference(toString(set1), toString(set2)).length === 0;
}

/**
 * hasIntersection tests if the sets have atleast one intersecting element.
 * @param  {Array of fields}  set1      
 * @param  {Array of fields}  set2      
 * @param  {CompareFunction}  equalFunc 
 * @return {Boolean}           true, if the sets have atleast one intersecting element.
 */
function hasIntersection(set1, set2, equalFunc) {
	if (equalFunc !== undefined) {
		var equalFuncOptions = equalFunc.options || {nosubcode: true};
		return setDifference(toString(set1, equalFuncOptions), toString(set2, equalFuncOptions), equalFunc).length != toString(set1).length;
	}
	return setDifference(toString(set1), toString(set2), equalFunc).length != toString(set1).length;

}

function intersection(set1, set2) {

	return _.intersection( toString(set1), toString(set2) );
}

// checks for each item in array1 if it exists in array2, returning items that do not exist in array2
function setDifference(array1, array2, equalFunc) {
	return _.filter(array1, function(value) {
	  return !setContains(array2, value, equalFunc);
	});
}

function setContains(array, item, equalFunc) {
	if (equalFunc === undefined) {
		equalFunc = function(a,b) { return a === b; };
	}
	var i = 0, length = array.length;
	for (; i < length; i++) if ( equalFunc(array[i], item) ) return true;
	return false;
}

function toString(fields, opts) {
	opts = opts || {};
	if (!_.isArray(fields)) {
		fields = [fields];
	}
	
	var subfields = [];
	fields.forEach(function(field) {
		var data = _(field.subfield).map(function(subfield) {
			return (opts.nosubcode ? '' : subfield.$.code) + subfield._;
		});
		subfields = subfields.concat(data);
	});
	return subfields;
}

function abbrComparator(str1, str2) {
	var arr1 = str1.split(' ').sort();
	var arr2 = str2.split(' ').sort();
	if (longestItem(arr1) <= 1 ||
		longestItem(arr2) <= 1) {
		return false;
	}


	if (arr1.length !== arr2.length) {
		return false;
	}
	var i = 0, length = arr1.length;
	// Abbreviations are in the beginning of sorted name, 
	// so start from the end of the array to save abbreviations to last since they match more stuff
	for (; i < length; i++) if ( !has(arr1, arr2[length-1-i]) ) return false;
	return true;

	function eq(str1, str2) {
		if (str1 === undefined || str2 === undefined) return false;

		if (str1.length == 1 || str2.length == 1) {
			return str1.substr(0,1) === str2.substr(0,1);
		} else {
			return str1 === str2;
		}
	}
	function has(arr, item) {
		var i = 0, length = arr.length;
		for (; i < length; i++) if ( eq(arr[i], item) ) {
			delete(arr[i]);
			return true;
		}
		return false;
	}
}

function longestItem(arr) {
	var length = 0;
	for (var i=0;i<arr.length;i++) {
		if ( length < arr[i].length ) {
			length = arr[i].length;
		}
	}
	return length;
}

function lvComparator(threshold) {
	return function(str1, str2) {

		return wuzzy.levenshtein(str1, str2) >= threshold;
	};
}

function jaccardComparator(threshold) {
	return function(str1, str2) {
		//console.log(str1.split(' '), str2.split(' '), wuzzy.jaccard(str1.split(' '), str2.split(' ')));
		return wuzzy.jaccard(str1.split(' '), str2.split(' ')) >= threshold;
	};
}
function distanceComparator(maxDistance) {
	return function(num1, num2) {
		if (isInt(num1) && isInt(num2)) {

			var n1 = parseInt(num1,10);
			var n2 = parseInt(num2,10);
			return Math.abs(n1-n2) <= maxDistance;
		}
		return false;

	};
	
}
function skipSmallerThan(num) {
	return function(num1, num2) {
	
		if (isInt(num1) && isInt(num2)) {
			if (num1 < num) { 
				return false; 
			}
			if (num2 < num) { 
				return false; 
			}
			return num1 === num2;

		}
		return false;

	};
	
}
function isInt(x) {
   var y = parseInt(x, 10);
   return !isNaN(y) && x == y && x.toString() == y.toString();
}


function stringPartofComparator(str1, str2) {
	if (str1.length < 2 || str2.length < 2) {
		return false;
	}

	var smaller = (str1.length < str2.length) ? str1 : str2;
	var larger = (smaller == str1) ? str2 : str1;

	if (smaller.length / larger.length <= 0.2) {
		return false;
	}

	return larger.indexOf(smaller) != -1;

}

function stringPartofComparatorRatio(ratio) {

	return function(str1, str2) {
		var strLengthRatio = Math.min(str1.length, str2.length) / Math.max(str1.length, str2.length);
		if (strLengthRatio >= ratio) {
			return stringPartofComparator(str1, str2);
		} else {
			return false;
		}
	};
}
module.exports = {
	stringEquals: stringEquals,
	stringJaccard: stringJaccard,
	setCompare: setCompare,
	jaccard: wuzzy.jaccard,
	isSubset: isSubset,
	isIdentical: isIdentical,
	levenshtein: wuzzy.levenshtein,
	intersection: intersection,
	abbrComparator: abbrComparator,
	lvComparator: lvComparator,
	stringPartofComparator: stringPartofComparator,
	jaccardComparator: jaccardComparator,
	stringPartofComparatorRatio: stringPartofComparatorRatio,
	hasIntersection: hasIntersection,
	distanceComparator: distanceComparator,
	skipSmallerThan: skipSmallerThan
};