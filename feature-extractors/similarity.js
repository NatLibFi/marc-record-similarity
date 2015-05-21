/*jshint node:true */
"use strict";

var _ = require('underscore');
var sprintf = require('sprintf').sprintf;

var compareFuncs = require('./core.compare');
var filterFuncs = require('./core.filter');
var normalizeFuncs = require('./core.normalize');
var wordMaps = require('./core.wordmap');

// Certainty
var SURE = 1;
var ALMOST_SURE = 0.8;
var MAYBE = 0.5;
var SURELY_NOT = 0;
var ABSOLUTELY_NOT_DOUBLE = -1;

function Similarity(strategy) {

	var VERBOSE = false;

	function compareRecords(record1, record2) {
		
		var checkers = strategy.map(function(checkDefinition) {
			var CheckObject = eval(checkDefinition.name);
			var checkInstance = new CheckObject(record1, record2);
			checkInstance.weight = checkDefinition.weight || 1;
			checkInstance.name = checkDefinition.name;

			return checkInstance;
		});

		var results = [];
		checkers.forEach(function(checker) {

			var similarity = checker.check();
			checker.similarity = similarity;
			results.push({
				checker: checker,
				name: checker.name,
				weight: checker.weight,
				similarity: checker.similarity
			});

		});

		return {
			results: results,
			record1: record1,
			record2: record2,
			strategy: strategy,
			similarity: calculateTotalSimilarity(results)
		};

	}

	function calculateTotalSimilarity( results ) {

		var nonSkippedChecks = results.filter(function(res) { return res.similarity !== null; });

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


	function dateOfPublication(record) {

		var fields1 = select(['260..c'], record);

		if (fields1.length == 0) {
	
			var rec1_008 = _(record.controlfield).find(function(f) {return f.$.tag == "008"; } );
			
			var fields_from_008_1 = [rec1_008._.substr(7,4), rec1_008._.substr(11,4)].map(createField('008','a'));
			
			fields1 = fields1.concat(fields_from_008_1);
		}

		var normalized1 = normalize( fields1 , ['onlyYearNumbers', 'removeEmpty']);
		
		var set1 = normalized1;

		set1 = set1.map(function(field) {
			return _.pluck(field.subfield, "_");
		});
		set1 = _( _(set1).flatten() ).uniq();

		if (set1.length === 0) {
			return 9999;
		}

		return _(set1).max();

	}


	function removeSubfields(func) {
		return function(field) {
			field.subfield = field.subfield.filter(function(subfield) {
				return !func(subfield);
			});
		};
	}

	function subCode(subcode) {
		return function(subfield) {
			return (subfield.$.code == subcode);
		};
	}
	function shortenThan(subcode, length) {
		return function(subfield) {
			return (subfield.$.code == subcode && subfield._.length < length);
		};
	}


	function actOnPublicationDate(year, action) {
		return function(record, fields, normalized) {
			if (dateOfPublication(record) < year) {
				normalized.forEach(action);
				fields.push(generateField(999, 'a', dateOfPublication(record)));
			}
		};
	}
	
	function addISBN13CheckDigit(isbn) {
		if (isbn.length != 12) {
			throw new Error("ISBN13CheckDigit can only handle ISBN13 (without check digit");
		}

		var sum = isbn.split('').reduce(function(memo, val, i) {
			var num = parseInt(val, 10);
			
			if (i%2 == 0) {
				memo += num;
			} else {
				memo += num*3;
			}

			return memo;
		}, 0);

		var checkDigit = 10 - (sum%10);
	
		if (checkDigit == 10) {
			checkDigit = 0;
		}
		isbn += checkDigit;

		return isbn;

	}

	function convertFieldToISBN13(field) {
		field.subfield.forEach(function(subfield) {
			if (subfield.$.code == 'a') {

				subfield._ = convertToISBN13(subfield._);
		
			}
		});
	}

	function convertToISBN13(isbn) {
		if (isbn === undefined || isbn.length !== 10) {
			return isbn;
		}

		return addISBN13CheckDigit( "978" + isbn.substring(0,9) );
		
		
	}

	function removeSidNid() {
		return normalizeFuncs.replace( new RegExp(/\s*\(.*\)$/) );
	}

	function ISBN(record1, record2) {
		
		var fields1 = select(['020..a'], record1);
		var fields2 = select(['020..a'], record2);

		var normalized1 = normalize( clone(fields1) , ['delChars(":-")', 'trimEnd', 'upper', removeSidNid()]);
		var normalized2 = normalize( clone(fields2) , ['delChars(":-")', 'trimEnd', 'upper', removeSidNid()]);
	
		normalized1.forEach(removeSubfields(shortenThan('c', 3)));
		normalized2.forEach(removeSubfields(shortenThan('c', 3)));

		var removeISBNFromOldRecord = actOnPublicationDate(1972, removeSubfields(subCode('a')));
		removeISBNFromOldRecord(record1, fields1, normalized1);
		removeISBNFromOldRecord(record2, fields2, normalized2);

		normalized1.forEach(convertToISBN13);
		normalized2.forEach(convertToISBN13);


		var set1 = normalized1;
		var set2 = normalized2;


		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function check() {

			//if ISBNs are missing, we skip the step.
			if (set1.length === set2.length === 0) {
				return null;
			}

			//if other is missing an isbn, then we skip the step
			if (set1.length === 0 || set2.length === 0) {
				return null;
			}

			//if set1 or set2 dont have any a subfields, skip
			if (!hasSubfield(set1, 'a') || !hasSubfield(set2, 'a')) {
				return null;
			}

			//if the sets are identical, we are sure by isbn
			if (compareFuncs.isIdentical(set1, set2)) {
				return SURE;
			}

			//if other set is subset of the other, then we are sure by isbn
			if (compareFuncs.isSubset(set1, set2) || compareFuncs.isSubset(set2, set1)) {
				return ALMOST_SURE;
			}

			//if the sets have a single identical entry, (but some non-identical entries too) we are almost sure by isbn
			if (compareFuncs.intersection(set1, set2).length > 0) {
				return 0.6;
			}

			//erottelevana isbnnä vois olla 7##,530 kentässä "tämä teos on kuvattu erilaisessa ilmisasussa jonka isbn on tämä" eli näitä ei yhteen!

			//jos isbn tarkistusnumero ei matsaa, niin vertaa normalisoidulla levenshteinillä?
			
			//515 kentässä voi olla kokoteoksen isbn? 
			
			//TODO: Q-osakenttä,
			
			// Otherwise the isbns suggest that these are different records.
			return SURELY_NOT;
		}

		return {
			check: check,
			getData: getData
		};
	}



	function AdditionalPhysicalForm(record1, record2) {
		//note: test data contains 0 cases..
		
		// node sim.js -v AdditionalPhysicalForm ../data/000435629.xml ../data/005209195.xml

		var fields1 = select(['530','020'], record1);
		var fields2 = select(['530','020'], record2);

		var normalizations = ['delChars(":-")', 'trimEnd', 'upper', parseISBN];
		var normalized1 = normalize( clone(fields1) , normalizations);
		var normalized2 = normalize( clone(fields2) , normalizations);

		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function check() {

			var set1_530 = getFields(set1, '530a');
			var set2_530 = getFields(set2, '530a');

			var set1_020 = getFields(set1, '020a');
			var set2_020 = getFields(set2, '020a');

			if (compareFuncs.isSubset(set2_020, set1_530).length > 0 ||
				compareFuncs.isSubset(set1_020, set2_530).length > 0) {
				return ABSOLUTELY_NOT_DOUBLE;
			}

			return null;
		}


		return {
			check: check,
			getData: getData
		};
	}

	/**
	 * 515 vertaus 020 kenttään. Ei vertaa 515 kenttiä keskenään!
	 * 
	 * @param {[type]} record1 [description]
	 * @param {[type]} record2 [description]
	 *
	 * 
	 * test case: ../diff.sh ../data/005570116.xml ../data/005570117.xml
	 * 
	 */
	
	function ISBNExtra(record1, record2) {

		var fields1 = select(['515','020'], record1);
		var fields2 = select(['515','020'], record2);
		
		var normalizations = ['delChars(":-")', 'trimEnd', 'upper', parseISBN];
		var normalized1 = normalize( clone(fields1) , normalizations);
		var normalized2 = normalize( clone(fields2) , normalizations);

		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function check() {

			var set1_515 = getFields(set1, '515a');
			var set2_515 = getFields(set2, '515a');

			var set1_020 = getFields(set1, '020a');
			var set2_020 = getFields(set2, '020a');

			

			if (compareFuncs.intersection(set1_515, set2_515).length > 0) {
				return SURELY_NOT;
			}

			if (compareFuncs.intersection(set1_515, set2_020).length > 0 ||
				compareFuncs.intersection(set2_515, set1_020).length > 0) {
				return MAYBE;
			}

			return null;
		}



		return {
			check: check,
			getData: getData
		};
	}
	function parseISBN(fields) {
		fields.forEach(function(field) {
		
			var subfields = [];

			field.subfield.forEach(function(subfield) {
				var matches;

				matches = /([0-9]{13})/.exec(subfield._);
				if (matches !== null) {
					subfield._ = matches[1];
					subfields.push(subfield);
					return;
				}

				matches = /([0-9X]{10})/.exec(subfield._);
				if (matches !== null) {

					subfield._ = convertToISBN13(matches[1]);
					subfields.push(subfield);
					return;
				}
				
			});
			field.subfield = subfields;
		});
	
		return fields;
	}
	function ISSN(record1, record2) {
		
		var fields1 = select(['022..a'], record1);
		var fields2 = select(['022..a'], record2);

		var normalized1 = normalize( clone(fields1) , ['delChars(":-")', 'trimEnd', 'upper']);
		var normalized2 = normalize( clone(fields2) , ['delChars(":-")', 'trimEnd', 'upper']);
	
		var removeISSNFromOldRecord = actOnPublicationDate(1974, removeSubfields(subCode('a')));
		removeISSNFromOldRecord(record1, fields1, normalized1);
		removeISSNFromOldRecord(record2, fields2, normalized2);

		var set1 = normalized1;
		var set2 = normalized2;


		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}


		function check() {

			//if other is missing, then we skip the step
			if (set1.length === 0 || set2.length === 0) {
				return null;
			}

			//if set1 or set2 dont have any a subfields, skip
			if (!hasSubfield(set1, 'a') || !hasSubfield(set2, 'a')) {
				return null;
			} 

		

			//if the sets are identical, we are sure 
			if (compareFuncs.isIdentical(set1, set2)) {
				return SURE;
			}

			//if other set is subset of the other, then we are sure
			if (compareFuncs.isSubset(set1, set2) || compareFuncs.isSubset(set2, set1)) {
				return SURE;
			}

			//if the sets have a single identical entry, (but some non-identical entries too) we are almost sure
			if (compareFuncs.intersection(set1, set2).length > 0) {
				return ALMOST_SURE;
			}

			//260c might be interesting
			
			
			return SURELY_NOT;
		}

		return {
			check: check,
			getData: getData
		};


	}

	// field 024 has multiple different standard numbers which share same check function.
	
	function f024checkFunc(set1, set2) {

		return function() {


			if (set1.length === 0 || set2.length === 0) {
				return null;
			}

			if (!hasSubfield(set1, 'a') || !hasSubfield(set2, 'a')) {
				return null;
			} 

			if (compareFuncs.isIdentical(set1, set2)) {
				return SURE;
			}

			if (compareFuncs.isSubset(set1, set2) || compareFuncs.isSubset(set2, set1)) {
				return SURE;
			}

			if (compareFuncs.intersection(set1, set2).length > 0) {
				return ALMOST_SURE;
			}

			return SURELY_NOT;

		};

	}

	var f024Normalizations = ['delChars(":-")', 'trimEnd', 'upper'];

	function ISRC(record1, record2) {
		
		var fields1 = select(['0240.a'], record1);
		var fields2 = select(['0240.a'], record2);
	
		var normalized1 = normalize( clone(fields1) , f024Normalizations);
		var normalized2 = normalize( clone(fields2) , f024Normalizations);

		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		return {
			check: f024checkFunc(set1, set2),
			getData: getData
		};
	}

	function UPC(record1, record2) {
		
		var fields1 = select(['0241.a'], record1);
		var fields2 = select(['0241.a'], record2);
	
		var normalized1 = normalize( clone(fields1) , f024Normalizations);
		var normalized2 = normalize( clone(fields2) , f024Normalizations);
	
		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		return {
			check: f024checkFunc(set1, set2),
			getData: getData
		};
	}

	function ISMN(record1, record2) {
		
		var fields1 = select(['0242.a'], record1);
		var fields2 = select(['0242.a'], record2);
	
		var normalized1 = normalize( clone(fields1) , f024Normalizations);
		var normalized2 = normalize( clone(fields2) , f024Normalizations);
	
		var removeISMNFromOldRecord = actOnPublicationDate(1992, removeSubfields(subCode('a')));
		removeISMNFromOldRecord(record1, fields1, normalized1);
		removeISMNFromOldRecord(record2, fields2, normalized2);

		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		return {
			check: f024checkFunc(set1, set2),
			getData: getData
		};
	}

	function EAN(record1, record2) {
		
		var fields1 = select(['0243.a'], record1);
		var fields2 = select(['0243.a'], record2);
	
		var normalized1 = normalize( clone(fields1) , f024Normalizations);
		var normalized2 = normalize( clone(fields2) , f024Normalizations);

		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		return {
			check: f024checkFunc(set1, set2),
			getData: getData
		};
	}

	function SICI(record1, record2) {
		
		var fields1 = select(['0244.a'], record1);
		var fields2 = select(['0244.a'], record2);
	
		var normalized1 = normalize( clone(fields1) , f024Normalizations);
		var normalized2 = normalize( clone(fields2) , f024Normalizations);
	
		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		return {
			check: f024checkFunc(set1, set2),
			getData: getData
		};
	}

	function MISC024(record1, record2) {
		
		var fields1 = select(['0247.a2'], record1);
		var fields2 = select(['0247.a2'], record2);
	
		var normalized1 = normalize( clone(fields1) , f024Normalizations);
		var normalized2 = normalize( clone(fields2) , f024Normalizations);
	
		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		return {
			check: f024checkFunc(set1, set2),
			getData: getData
		};
	}

	function has880(record1, record2) {
		
		var fields1 = select(['880'], record1);
		var fields2 = select(['880'], record2);

		var normalized1 = fields1;
		var normalized2 = fields2;
	
		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function check() {

			// return -1, that is stop checking, if either record has field 880
			if (set1.length !== 0 || set2.length !== 0) {
				return -1;
			}
			return null;
		}

		return {
			check: check,
			getData: getData
		};
	}

	function ISRN(record1, record2) {

		var fields1 = select(['027..a'], record1);
		var fields2 = select(['027..a'], record2);

		var normalized1 = normalize( clone(fields1) , ['delChars(":-")', 'trimEnd', 'upper']);
		var normalized2 = normalize( clone(fields2) , ['delChars(":-")', 'trimEnd', 'upper']);
	
		var set1 = normalized1;
		var set2 = normalized2;


		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}


		function check() {

			if (set1.length === 0 || set2.length === 0) {
				return null;
			}

			if (!hasSubfield(set1, 'a') || !hasSubfield(set2, 'a')) {
				return null;
			} 

			if (compareFuncs.isIdentical(set1, set2)) {
				return SURE;
			}

			if (compareFuncs.isSubset(set1, set2) || compareFuncs.isSubset(set2, set1)) {
				return SURE;
			}

			if (compareFuncs.intersection(set1, set2).length > 0) {
				return ALMOST_SURE;
			}
			
			return SURELY_NOT;
		}

		return {
			check: check,
			getData: getData
		};

	}
	/*
	 LIBRARY OF CONGRESS KONTROLLINUMERO
	 
	 */
	function F010(record1, record2) {
		
		var fields1 = select(['010..a'], record1);
		var fields2 = select(['010..a'], record2);

		var normalized1 = normalize( clone(fields1) , ['delChars(":-")', 'trimEnd', 'upper']);
		var normalized2 = normalize( clone(fields2) , ['delChars(":-")', 'trimEnd', 'upper']);
	
		var set1 = normalized1;
		var set2 = normalized2;


		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function check() {

			if (set1.length === 0 || set2.length === 0) {
				return null;
			}

			if (!hasSubfield(set1, 'a') || !hasSubfield(set2, 'a')) {
				return null;
			} 

			if (compareFuncs.isIdentical(set1, set2)) {
				return SURE;
			}

			if (compareFuncs.isSubset(set1, set2) || compareFuncs.isSubset(set2, set1)) {
				return SURE;
			}

			if (compareFuncs.intersection(set1, set2).length > 0) {
				return ALMOST_SURE;
			}

			return SURELY_NOT;
		}

		return {
			check: check,
			getData: getData
		};

	}

	function F015(record1, record2) {
		
		var fields1 = select(['015..a'], record1);
		var fields2 = select(['015..a'], record2);

		var normalized1 = normalize( clone(fields1) , ['delChars(":-")', 'trimEnd', 'upper']);
		var normalized2 = normalize( clone(fields2) , ['delChars(":-")', 'trimEnd', 'upper']);
	
		var set1 = normalized1;
		var set2 = normalized2;


		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function check() {

			if (set1.length === 0 || set2.length === 0) {
				return null;
			}

			if (!hasSubfield(set1, 'a') || !hasSubfield(set2, 'a')) {
				return null;
			} 

			if (compareFuncs.isIdentical(set1, set2)) {
				return SURE;
			}

			if (compareFuncs.isSubset(set1, set2) || compareFuncs.isSubset(set2, set1)) {
				return SURE;
			}

			if (compareFuncs.intersection(set1, set2).length > 0) {
				return ALMOST_SURE;
			}

			return SURELY_NOT;
		}

		return {
			check: check,
			getData: getData
		};

	}

	function F027(record1, record2) {
		
		var fields1 = select(['027'], record1);
		var fields2 = select(['027'], record2);

		var normalized1 = normalize( clone(fields1) , ['delChars(":-")', 'trimEnd', 'upper']);
		var normalized2 = normalize( clone(fields2) , ['delChars(":-")', 'trimEnd', 'upper']);
	
		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function check() {

			if (set1.length === 0 || set2.length === 0) {
				return null;
			}

			if (!hasSubfield(set1, 'a') || !hasSubfield(set2, 'a')) {
				return null;
			} 

			if (compareFuncs.isIdentical(set1, set2)) {
				return SURE;
			}

			if (compareFuncs.isSubset(set1, set2) || compareFuncs.isSubset(set2, set1)) {
				return SURE;
			}

			if (compareFuncs.intersection(set1, set2).length > 0) {
				return ALMOST_SURE;
			}

			return SURELY_NOT;
		}

		return {
			check: check,
			getData: getData
		};

	}

	function reprint(record1, record2) {

		var fields1 = select(['300..a', '250..a'], record1);
		var fields2 = select(['300..a', '250..a'], record2);

		var normalized1 = normalize( clone(fields1) , ['delChars(":-")', 'onlyNumbers', 'trimEnd', 'upper']);
		var normalized2 = normalize( clone(fields2) , ['delChars(":-")', 'onlyNumbers', 'trimEnd', 'upper']);
	
		var set1 = normalized1;
		var set2 = normalized2;


		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function check() {

			if (set1.length === 0 || set2.length === 0) {
				return null;
			}

			//First, compare 250a fields
			var set1_f250a = getField(set1, '250a');
			var set2_f250a = getField(set2, '250a');

			if (set1_f250a === undefined || set2_f250a === undefined) {
				return null;
			}

			if (set1_f250a == set2_f250a) {
			
				return SURE;
			
			} else {
				var set1_f300a = getField(set1, '300a');
				var set2_f300a = getField(set2, '300a');

				//Allow 2 page difference!
				if (Math.abs(set1_f300a - set2_f300a) <= 2) {
					return ALMOST_SURE;
				}
			}

			return SURELY_NOT;

		}

		return {
			check: check,
			getData: getData
		};
	}

	function createField(tag, subcode) {
		return function(fieldContent) {
			return generateField(tag, subcode, fieldContent);
		};
	}

	function years(record1, record2) {
		//will generate a set of years found in the record for matching
		//500a, 008 merkkipaikat 7-11 ja 12-16 + 260c tehdään vuosista setti ja verrataan niitä keskenään
		
		var fields1 = select(['260..c', '500..a'], record1);
		var fields2 = select(['260..c', '500..a'], record2);

		var rec1_008 = _(record1.controlfield).find(function(f) {return f.$.tag == "008"; } );
		var rec2_008 = _(record2.controlfield).find(function(f) {return f.$.tag == "008"; } );

		if (rec1_008 === undefined) {
			throw new Error("Record is missing field 008");
		}
		if (rec2_008 === undefined) {
			throw new Error("Record is missing field 008");
		}

		var fields_from_008_1 = [rec1_008._.substr(7,4), rec1_008._.substr(11,4)].map(createField('008','a'));
		var fields_from_008_2 = [rec2_008._.substr(7,4), rec2_008._.substr(11,4)].map(createField('008','a'));

		fields1 = fields1.concat(fields_from_008_1);
		fields2 = fields2.concat(fields_from_008_2);

		var normalized1 = normalize( clone(fields1) , ['onlyYearNumbers', 'removeEmpty']);
		var normalized2 = normalize( clone(fields2) , ['onlyYearNumbers', 'removeEmpty']);
	
		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function check() {

			
			if (set1.length === 0 || set2.length === 0) {
				return null;
			}

			if (compareFuncs.isIdentical(set1, set2)) {
				return SURE;
			}

			var equalFunc = function(a,b) {
				return a === b;
			};
			equalFunc.options = { nosubcode: true };

			if (compareFuncs.isSubset(set1, set2, equalFunc) || compareFuncs.isSubset(set2, set1, equalFunc)) {
				return ALMOST_SURE;
			}

			return SURELY_NOT;

		}

		return {
			check: check,
			getData: getData
		};
	}

	function getFields(set, selector) {

		var tag = selector.substr(0,3);
		var subcode = selector.substr(3,1);

		var fields = set.filter(function(field) {
			return field.$.tag == tag;
		});
		
		var retFields = clone(fields);
		retFields.forEach(function(field) {
			var subfields = field.subfield.filter(function(subfield) {
				return subfield.$.code == subcode;
			});

			field.subfield = subfields;

		});
		return retFields;

	}

	function getField(set, selector) {
		var tag = selector.substr(0,3);
		var subcode = selector.substr(3,1);

		var fields = set.filter(function(field) {
			return field.$.tag == tag;
		});
		
		if (fields.length > 1) {
			
			console.log("\nWarning: has multiple " + selector +":");

		}
		if (fields.length === 0) {
			return undefined;
		}
		var ret = clone(fields[0]);
		
		ret.subfield = ret.subfield.filter(function(subfield) {
			return subfield.$.code == subcode;
		});
	
		if (ret.subfield.length > 1) {
			throw new Error("field has multiple subfields of " + selector);
		}
		if (ret.subfield.length === 0) {
			return undefined;
		}
		return ret.subfield[0]._;
		
	}
	
	function title(record1, record2) {

		var fields1 = select(['245..ab'], clone(record1));
		var fields2 = select(['245..ab'], clone(record2));
	
		var f246a1 = select(['246..a'], record1);
		var f246a2 = select(['246..a'], record2);

		var f245pn1 = select(['245..pn'], record1);
		var f245pn2 = select(['245..pn'], record2);

		var normalized1 = normalize(clone(fields1), ['utf8norm', 'removediacs']);// , ['toSpace("-")', 'delChars("\':,.")', 'trimEnd', 'upper', 'utf8norm', 'removediacs']);
		var normalized2 = normalize(clone(fields2), ['utf8norm', 'removediacs']);// , ['toSpace("-")', 'delChars("\':,.")', 'trimEnd', 'upper', 'utf8norm', 'removediacs']);
	
		fields1[0].subfield = fields1[0].subfield.concat(clone(f245pn1[0]).subfield);
		fields2[0].subfield = fields2[0].subfield.concat(clone(f245pn2[0]).subfield);
		
		
		f245pn1.forEach(collapseIdenticalNumbersFromSubfield('n'));
		f245pn2.forEach(collapseIdenticalNumbersFromSubfield('n'));

		//This will turn this:
		//  Osa 6 = Del 6 = Part 6
		//into this:
		//  Osa = Del = Part 6
		function collapseIdenticalNumbersFromSubfield(code) {
			return function(field) {

				field.subfield.forEach(function(subfield) {
					if (subfield.$.code == code) {
						var subfieldParts = subfield._.split("=");
						var numbers = subfieldParts.map(function(part) {
							return part.replace(/\D/g, '');
						});
						var texts = subfieldParts.map(function(part) {
							return part.replace(/[^\D]/g, '').replace(/\s+/,' ');
						});

						subfield._ = texts.join("=") + _.uniq(numbers).join(" ");
						
					}

				});
			};
		}

		f245pn1 = normalize(f245pn1, ['toSpace("[],=:-()/")', wordMap, 'toSpace(".")', 'romanToArabic']);
		f245pn2 = normalize(f245pn2, ['toSpace("[],=:-()/")', wordMap, 'toSpace(".")', 'romanToArabic']);

		function wordMap(fields) {
			normalizeFuncs.applyToFieldValues(fields, function(content) {
				return content.split(' ').map(translate).join(' ');
			}, {});

			return fields;
			function translate(word) {
				return wordMaps.map245n(word);
			}
		}

		f245pn1.forEach(abbrSubfield('n'));
		f245pn2.forEach(abbrSubfield('n'));

		fields1 = fields1.concat(f246a1);
		fields2 = fields2.concat(f246a2);
		
		normalized1.forEach(parseTitles);
		normalized2.forEach(parseTitles);

		normalized1.forEach(toFieldFragments);
		normalized2.forEach(toFieldFragments);

		
		normalized1 = normalized1.concat( normalize(clone(f246a1), ['utf8norm', 'removediacs']));
		normalized2 = normalized2.concat( normalize(clone(f246a2), ['utf8norm', 'removediacs']));

		var normalized_f245pn1 = normalize(clone(f245pn1), ['utf8norm', 'removediacs']);
		var normalized_f245pn2 = normalize(clone(f245pn2), ['utf8norm', 'removediacs']);

		normalized1[0].subfield = normalized1[0].subfield.concat( normalized_f245pn1[0].subfield );
		normalized2[0].subfield = normalized2[0].subfield.concat( normalized_f245pn2[0].subfield );

		normalized1 = normalize(clone(normalized1), ['toSpace("-")','delChars("\'/,.:\\"")', 'trim', 'upper', 'collapse']);
		normalized2 = normalize(clone(normalized2), ['toSpace("-")','delChars("\'/,.:\\"")', 'trim', 'upper', 'collapse']);

		function check() {

			//check function will mutate sets, so make a clone.
			var set1 = clone(normalized1);
			var set2 = clone(normalized2);


			//if both are missing, we skip the step.
			if (set1.length === set2.length === 0) {
				return null;
			}

			//if other is missing, then we skip the step
			if (set1.length === 0 || set2.length === 0) {
				return null;
			}


			if (hasSubfield(set1, 'n') && hasSubfield(set2, 'n')) {
				var rec1n = get(set1, '245', 'n').join();
				var rec2n = get(set2, '245', 'n').join();

				rec1n = withoutYears(rec1n);
				rec2n = withoutYears(rec2n);

				var numbers1 = rec1n.split('').filter(isNumber).join();
				var numbers2 = rec2n.split('').filter(isNumber).join();

				if (numbers1 !== numbers2) {
					return ABSOLUTELY_NOT_DOUBLE;
				}

			}
			// Necessary checks for n-subfield has been done, remove it from poisoning the rest of checks,
			// since it is hard to normalize because of it's many formats.
			set1.forEach(removeSubfields('n'));
			set2.forEach(removeSubfields('n'));
			
			

			if (!hasSubfield(set1, 'X') || !hasSubfield(set2, 'X')) {
				return null;
			}

			if (compareFuncs.isIdentical(set1, set2)) {
				return SURE;
			}

			if (compareFuncs.isSubset(set1, set2) || compareFuncs.isSubset(set2, set1)) {
				var subs1 = set1.reduce(function(memo, field) { memo = memo.concat(field.subfield); return memo; }, []);
				var subs2 = set2.reduce(function(memo, field) { memo = memo.concat(field.subfield); return memo; }, []);


				var ratio = Math.min(subs1.length, subs2.length) / Math.max(subs1.length, subs2.length);
				
				if (ratio >= 0.5 ) {
					
					return 0.5;	
				}
			}

			// TODO: if sets are identical with lv-distance, we are almost sure
			// example: > node sim.js title ../data/000056436.xml ../data/003401461.xml
			if (compareFuncs.isIdentical(set1, set2, compareFuncs.lvComparator(0.85))) {
				
				return ALMOST_SURE;
			}

			// if one set has strings that are contained is the set of other strings
			if (compareFuncs.isIdentical(set1, set2, compareFuncs.stringPartofComparatorRatio(0.75))) {
				return ALMOST_SURE;
			}		

			// if one set has strings that are contained is the set of other strings
			if (compareFuncs.isIdentical(set1, set2, compareFuncs.stringPartofComparator)) {
				return 0.3;
			}		

			return SURELY_NOT;


			// removes words that are 4 characters long nad between 1000 and 2100 (exclusive)
			function withoutYears(str) {
				str = str.split(' ').filter(function(str) { return !isYear(str); }).join(' ');
				return str;
			}
			function isYear(str) {

				if (str.length != 4) return false;
				if (isNaN(str)) return false;
				var number = parseInt(str, 10);

				return number < 2100 && number > 1000;
			}

			function removeSubfields(subCode) {
				return function(field) {
					field.subfield = field.subfield.filter(function(subfield) {
						return (subfield.$.code !== subCode);
					});
				};
			}

			function isNumber(char) {
				if (char === '' || char === ' ') return false;
				return !isNaN(char);
			}

			function get(set, tag, subCode) {
				var contents = [];
				set.forEach(function(field) {
					if (field.$.tag == tag) {
						field.subfield.forEach(function(subfield) {
							if (subfield.$.code === subCode) {
								contents.push(subfield._);
							}
						});
					}
				});
				return contents;
			}

		}


		return {
			check: check,
			getData: getData
		};

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function toFieldFragments(field) {
			var newSubfields = field.subfield.map(function(subfield) {
				var parts = subfield._.split(":");
				return parts.map(function(part) {
					return {
						'_': part.trim(),
						'$': { code: 'X' }
				}	;
				});
			});
			
			field.subfield = _.flatten(newSubfields);
		}

		function parseTitles(field) {
			var str1 = _(field.subfield).reduce(function(memo, subfield) {
				return memo + subfield._ + " ";
			}, "");
			field.subfield = str1.split("=").map(function(subfieldContent) {
				return {
					'_': subfieldContent.trim(),
					'$': { code: 'X' }
				};
			});
		}		
		function abbrSubfield(subCode) {
			return function(field) {
				field.subfield.forEach(function(subfield) {
					if (subfield.$.code == subCode) {
						subfield._ = subfield._.split(" ").map(abbr).sort().join(' ');
					}
				});
			};
			function abbr(str) {
				if (isNaN(str[0])) return str[0];
				return str;
			}
		}

	}

	var nonDescriptiveFields = ["LOW","CAT","SID", "001", "005", "080"];
	function isDescriptiveField(field) {
		if (nonDescriptiveFields.indexOf(field.$.tag) != -1) {
			return false;
		}
		return true;
	}

	// Checks for the equality of 245c, other cases should be handled by 'author' check.
	function charsimilarity(record1, record2) {
		var fields1 = record1.controlfield.filter(isDescriptiveField);
		var fields2 = record2.controlfield.filter(isDescriptiveField);
	
		var dataFields1 = record1.datafield.filter(isDescriptiveField);
		var dataFields2 = record2.datafield.filter(isDescriptiveField);

		var normalizations = ['toSpace("-")', 'delChars("\':,.")', 'trimEnd', 'upper', 'utf8norm', 'removediacs', 'removeEmpty'];

		var normalized1 = fields1.concat(normalize(clone(dataFields1), normalizations) );
		var normalized2 = fields2.concat(normalize(clone(dataFields2), normalizations) );

		fields1 = fields1.concat(dataFields1);
		fields2 = fields2.concat(dataFields2);

		var str1 = normalizeFuncs.fieldsToString( fields1 );
		var str2 = normalizeFuncs.fieldsToString( fields2 );
	
		var set1 = str1;
		var set2 = str2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function check() {

			//if other is missing, then we skip the step
			if (set1.length === 0 || set2.length === 0) {
				return null;
			}

			var change = compareFuncs.levenshtein(set1, set2 );
		
			if (change > 0.60) {
				return change;
			}

			// Otherwise suggest that these are different records.
			return SURELY_NOT;
		}

		return {
			check: check,
			getData: getData
		};
	}
	
	function publisher(record1, record2) {
		var fields1 = select(['260..ab'], record1);
		var fields2 = select(['260..ab'], record2);

		var norm = ['toSpace("-.")', 'delChars("\':,[]()")', 'trimEnd', 'upper', 'utf8norm', 'removediacs', 'removeEmpty'];
		var normalized1 = normalize(clone(fields1), norm);
		var normalized2 = normalize(clone(fields2), norm);

		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function check() {

			if (set1.length === 0 || set2.length === 0) {
				return null;
			}

			if (compareFuncs.isIdentical(set1, set2)) {
				return SURE;
			}

			if (compareFuncs.isIdentical(set1, set2, compareFuncs.lvComparator(0.65))) {
				return ALMOST_SURE;
			}

			if (compareFuncs.intersection(set1, set2).length > 0) {
				return 0.7;
			}

			if (compareFuncs.isIdentical(set1, set2, compareFuncs.jaccardComparator(0.5))) {
				return 0.7;
			}
			
			if (compareFuncs.hasIntersection(set1, set2, compareFuncs.jaccardComparator(0.5))) {
				return 0.5;
			}
			if (compareFuncs.hasIntersection(set1, set2, compareFuncs.stringPartofComparator)) {
				return 0.5;
			}

			return SURELY_NOT;
		}


		return {
			check: check,
			getData: getData
		};
	
	}

	function size(record1, record2) {
		// Pathological case:
		// node sim -v size ../data/000225878.xml ../data/003171417.xml
		var fields1 = select(['300..a'], record1);
		var fields2 = select(['300..a'], record2);

		var norm = ['utf8norm', 'removediacs', 'onlyNumbers', 'removeEmpty'];
		var normalized1 = normalize(clone(fields1), norm);
		var normalized2 = normalize(clone(fields2), norm);

		var aSubcodeExtractor = function(field) {
			return getSubfields(field, 'a');
		};
		//var f1_s = _.flatten(normalized1.map(aSubcodeExtractor)).map(normalizeFuncs.onlyNumbers);
		//var f2_s = _.flatten(normalized2.map(aSubcodeExtractor)).map(normalizeFuncs.onlyNumbers);

		var f1_s = _.flatten(normalized1.map(aSubcodeExtractor));
		var f2_s = _.flatten(normalized2.map(aSubcodeExtractor));


		normalized1 = [];
		normalized2 = [];

		f1_s.forEach(function(item) {
			item.split(' ').forEach(addTo(normalized1));
		});

		f2_s.forEach(function(item) {
			item.split(' ').forEach(addTo(normalized2));
		});

		function addTo(arr) {
			return function(content) {
				if (content !== "") {
					arr.push( generateField(300, 'a', content));
				}
			};
		}

/*
		f1_s.forEach(function(pageInfo) {
			if (pageInfo != null) {
				var contents = pageInfoToString(pageInfo);
				normalized1.push( generateField(300, 'a', contents) );
			}
		});
		f2_s.forEach(function(pageInfo) {
			if (pageInfo != null) {
				var contents = pageInfoToString(pageInfo);
				normalized2.push( generateField(300, 'a', contents) );
			}
		});

*/

		function pageInfoToString(pageInfo) {
			if (pageInfo.start !== 0) {
				return [
					sprintf("RANGE %d-%d", pageInfo.start, pageInfo.end),
					pageInfo.total
				];
			} else {
				if (pageInfo.total !== pageInfo.end) {
					return [pageInfo.end, pageInfo.total];
				}
				return pageInfo.end;
			}
		}

		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function check() {

			if (set1.length === 0 || set2.length === 0) {
				return null;
			}
			if (compareFuncs.isIdentical(set1, set2)) {
				return SURE;
			}
			if (compareFuncs.isIdentical(set1, set2, compareFuncs.distanceComparator(5))) {
				return ALMOST_SURE;
			}
			if (compareFuncs.isSubset(set1, set2, compareFuncs.distanceComparator(3)) ||
				compareFuncs.isSubset(set2, set1, compareFuncs.distanceComparator(3))) {
				return ALMOST_SURE;
			}
			if (compareFuncs.hasIntersection(set1, set2, compareFuncs.skipSmallerThan(20))) {
				return 0.5;
			}

			return 0;
		}

		return {
			check: check,
			getData: getData
		};
	}

	// Checks for the equality of 245c, other cases should be handled by 'author' check.
	function author245c(record1, record2) {
		var fields1 = select(['245..c'], record1);
		var fields2 = select(['245..c'], record2);

		var norm245c = ['toSpace("-")', 'delChars("\':,.")', 'trimEnd', 'upper', 'utf8norm', 'removediacs', 'removeEmpty'];
		var normalized1 = normalize(select(['245..c'], record1), norm245c);
		var normalized2 = normalize(select(['245..c'], record2), norm245c);

		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function check() {

			if (set1.length === 0 || set2.length === 0) {
				return null;
			}

			if (!hasSubfield(set1, 'c') || !hasSubfield(set2, 'c')) {
				return null;
			} 

			function d(str) {
				return;
				console.log(str);
			}

			if (compareFuncs.isIdentical(set1, set2)) {
				return SURE;
			}

			// if one set has strings that are contained is the set of other strings
			// node sim.js author ../data/000926333.xml ../data/002407930.xml
			if (compareFuncs.isIdentical(set1, set2, compareFuncs.stringPartofComparator)) {
				d("isIdentical stringPartofComparator");
				return SURE;
			}			

			// Example: node sim.js author ../data/000040468.xml ../data/003099068.xml
			if (compareFuncs.isIdentical(set1, set2, compareFuncs.jaccardComparator(0.66))) {
				d("isIdentical jaccardComparator0.66");
				return ALMOST_SURE;
			}

			// TODO: if sets are identical with lv-distance, we are almost sure
			// example: > node sim.js author ../data/000021724.xml ../data/001073242.xml
			if (compareFuncs.isIdentical(set1, set2, compareFuncs.lvComparator(0.75))) {
				d("isIdentical lvComparator.75");
				return ALMOST_SURE;
			}
			
			return SURELY_NOT;
		}

		return {
			check: check,
			getData: getData
		};
	}
	function generateField(tag, subcode, content) {

		var field = {
			'$': {
				tag: tag
			},
			'subfield': []
		};

		if (_.isArray(content)) {
			content.forEach(addSubfield);
		} else {
			addSubfield(content);
		}

		return field;

		function addSubfield(content) {
			field.subfield.push({
				'$': { code: subcode },
				'_': content
			});
			
		}
	}

	function isNonEmpty(value) {
		if (value === undefined || value === null) { 
			return false; 
		}

		if (value === "") { 
			return false; 
		}

		return true;
	}

	function author(record1, record2) {

		var fields1 = select(['100', '110', '111', '700', '710', '711'], record1);
		var fields2 = select(['100', '110', '111', '700', '710', '711'], record2);

		var normalized1 = normalize( clone(fields1) , ['toSpace("-")', 'delChars("\':,.")', 'trimEnd', 'upper', 'utf8norm', 'removediacs', 'sortContent']);
		var normalized2 = normalize( clone(fields2) , ['toSpace("-")', 'delChars("\':,.")', 'trimEnd', 'upper', 'utf8norm', 'removediacs', 'sortContent']);
	

		var norm245c = ['toSpace("-")', 'delChars("\':,.")', 'trimEnd', 'upper', 'utf8norm', 'removediacs'];
		// There are authors in 245c too!
	
		var f245c1 = select(['245..c'], record1);
		var f245c2 = select(['245..c'], record2);
		// add 245c to fields so they are displayed for examination.
		fields1 = fields1.concat(f245c1);
		fields2 = fields2.concat(f245c1);

		// Parse authors from 245c into a single string.
		var a245c_authors1 = normalize(clone(f245c1), norm245c).map(toSubfieldValueArray);
		var a245c_authors2 = normalize(clone(f245c2), norm245c).map(toSubfieldValueArray);

		a245c_authors1 = _.flatten(a245c_authors1).join();
		a245c_authors2 = _.flatten(a245c_authors2).join();


		// Get author names into an array that have been found in author fields (100..711)
		var authorNames1 = _.flatten( normalized1.map(toSubfieldValueArray) );
		var authorNames2 = _.flatten( normalized2.map(toSubfieldValueArray) );

		// search authors from other records 245c
		var additionalAuthorsForRecord1 = searchAuthors(authorNames1, a245c_authors2);
		var additionalAuthorsForRecord2 = searchAuthors(authorNames2, a245c_authors1);

		normalized1 = normalized1.concat(additionalAuthorsForRecord1);
		normalized2 = normalized2.concat(additionalAuthorsForRecord2);

		function searchAuthors(authorNames, f245c_authors) {
		
			var additionalAuthorFields = [];
			authorNames = authorNames.filter(isNonEmpty);
			// Permutate all the names in the author fields
			authorNames.forEach(function(author) {
				var nameFragments = author.split(" ");

				var namePermutations;
				//permute name only if its only 5 or less words long.
				if (nameFragments.length < 6) {
					namePermutations = permute(nameFragments).map(function(set) { return set.join(" ");});
				} else {
					namePermutations = [author];
				}
				
				namePermutations.some(function(name) {
					
					if ( f245c_authors.indexOf(name) !== -1) {
						var field = [generateField(245,'c', name)];
						field = normalize(field, ['sortContent']);
						additionalAuthorFields.push( field[0] );
				
						return true;
					}
				});
			});

			return additionalAuthorFields;
		}

		var set1 = normalized1;
		var set2 = normalized2;

		function permute(set) {

			var permutations = [];
			var used = [];

			function generateFrom(set){
				var i, item;
				for (i = 0; i < set.length; i++) {
					item = set.splice(i, 1)[0];
					used.push(item);
					if (set.length === 0) {
						var copy = used.slice();
						permutations.push(copy);
					}
					generateFrom(set);
					set.splice(i, 0, item);
					used.pop();
				}
				return permutations;
			}

			return generateFrom(set);
		}

		function toSubfieldValueArray(field) {
			return field.subfield.reduce(function(memo, subfield) {
				memo.push(subfield._);
				return memo;
			}, []);
		}

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}

		function removeSquareBracketsAndContents() {
			return normalizeFuncs.replace( new RegExp(/\s*\(.*\)$/) );
		}

		function check() {

			//if both are missing, we skip the step.
			if (set1.length === set2.length === 0) {
				return null;
			}

			//if other is missing, then we skip the step
			if (set1.length === 0 || set2.length === 0) {
				return null;
			}

			//if set1 or set2 dont have any a or c subfields, skip
			if (!hasSubfield(set1, 'a') || !hasSubfield(set2, 'a')) {
				return null;
			} 

			function d(str) {
				return;
				console.log(str);
			}

			//if the sets are identical, we are sure
			if (compareFuncs.isIdentical(set1, set2)) {
				return SURE;
			}

			//if other set is subset of the other, then we are sure
			if (compareFuncs.isSubset(set1, set2) || compareFuncs.isSubset(set2, set1)) {
				return SURE;
			}

			// if one set has strings that are contained is the set of other strings
			// node sim.js author ../data/000926333.xml ../data/002407930.xml
			if (compareFuncs.isIdentical(set1, set2, compareFuncs.stringPartofComparator)) {
				d("isIdentical stringPartofComparator");
				return SURE;
			}			

			// if sets are identical with abbreviations, we are sure
			// Example: node sim.js author ../data/000007962.xml ../data/000631874.xml
			if (compareFuncs.isIdentical(set1, set2, compareFuncs.abbrComparator)) {
				d("isIdentical abbrComparator");
				return SURE;
			}
			
			// if sets are identical with jaccard, we are sure
			// Example: node sim.js author ../data/000040468.xml ../data/003099068.xml
			if (compareFuncs.isIdentical(set1, set2, compareFuncs.jaccardComparator(0.66))) {
				d("isIdentical jaccardComparator0.66");
				return ALMOST_SURE;
			}

			// TODO: if sets are identical with lv-distance, we are almost sure
			// example: > node sim.js author ../data/000021724.xml ../data/001073242.xml
			if (compareFuncs.isIdentical(set1, set2, compareFuncs.lvComparator(0.75))) {
				d("isIdentical lvComparator.75");
				return ALMOST_SURE;
			}
				//if other set is subset of the other with small lv-distance, then we are sure
			if (compareFuncs.isSubset(set1, set2, compareFuncs.lvComparator(0.75)) || 
				compareFuncs.isSubset(set2, set1, compareFuncs.lvComparator(0.75))) {

				d("isSubset lvComparator.75");
				return ALMOST_SURE;
			}

			//if the sets have a single identical entry, (but some non-identical entries too) we are almost sure
			if (compareFuncs.intersection(set1, set2).length > 0) {
				return MAYBE;
			}

			//if other set is subset of the other with small lv-distance, then we are sure
			if (compareFuncs.isSubset(set1, set2, compareFuncs.stringPartofComparator) || 
				compareFuncs.isSubset(set2, set1, compareFuncs.stringPartofComparator)) {
				d("isSubset stringPartofComparator");
				return 0.6; //SOMEWHAT_SURE?
			}

			// false positive: node sim.js author ../data/000662146.xml ../data/003106685.xml
			if (compareFuncs.isSubset(set1, set2, compareFuncs.abbrComparator) || 
				compareFuncs.isSubset(set2, set1, compareFuncs.abbrComparator)) {
				d("isSubset abbrComparator");
				return 0.6; //SOMEWHAT_SURE?
			}

			//if other set is subset of the other with jaccard, then we are sure
			if (compareFuncs.isSubset(set1, set2, compareFuncs.jaccardComparator(0.75)) || 
				compareFuncs.isSubset(set2, set1, compareFuncs.jaccardComparator(0.75))) {
				d("isSubset jaccardComparator.75");
				return 0.6; //SOMEWHAT_SURE?
			}
		

			
			//other is substring of the other
			function valueSubsetComparator(str1, str2) {
				var set1 = str1.split(' ');
				var set2 = str2.split(' ');
				return _.difference(set1, set2).length == 0;
			}

			//either have one identical word
			function valueIntersectionComparator(str1, str2) {
				var set1 = str1.split(' ');
				var set2 = str2.split(' ');
				return _.intersection(set1, set2);
			}


			// test for lv distanced names
			
			// Otherwise suggest that these are different records.
			return SURELY_NOT;
		}

		return {
			check: check,
			getData: getData
		};
	}

	function sarjat(record1, record2) {
		var fields1 = select(['490', '830'], record1);
		var fields2 = select(['490', '830'], record2);

		var normalized1 = clone(fields1);
		var normalized2 = clone(fields2);

		normalized1 = normalize( normalized1 , ['onlyNumbers', 'trim', 'sortContent'], {subcode: 'v'}); 
		normalized2 = normalize( normalized2 , ['onlyNumbers', 'trim', 'sortContent'], {subcode: 'v'});

		var normalizations = ['utf8norm', 'removediacs', 'delChars("\':;,.")', 'trimEnd', 'upper']; // ['toSpace("-")', 'delChars("\':,.")', 'trimEnd', 'upper', 'utf8norm', 'removediacs', 'sortContent']);
		normalized1 = normalize( normalized1 , normalizations); 
		normalized2 = normalize( normalized2 , normalizations);


		var set1 = normalized1;
		var set2 = normalized2;

		function getData() {
			return {
				fields: [fields1, fields2],
				normalized: [normalized1, normalized2]
			};
		}
		
		function check() {

			//if both are missing, we skip the step.
			if (set1.length === set2.length === 0) {
				return null;
			}

			//if other is missing, then we skip the step
			if (set1.length === 0 || set2.length === 0) {
				return null;
			}

			var wholeFieldComparator = function(field1, field2) {
				var subs1 = field1.subfield;
				var subs2 = field2.subfield;
	
				return isSubset(subs1, subs2) && isSubset(subs2, subs1);

				function isSubset(smallerSet, largerSet) {

					var identical = true;
					smallerSet.forEach(function(sub1) {

						var found = largerSet.some(function(sub2) {

							return (sub1.$.code == sub2.$.code && sub1._ == sub2._);
						
						});

						if (!found) {
							identical = false;
						}
					});
					return identical;
				}

			};
			//This will prevent the normalization of fields and subfields into sets, so that comparator can compare marc fields as marc fields instead of sets of strings.
			wholeFieldComparator.options = {
				noNormalization: true
			};

			//if the sets are identical, we are sure
			if (compareFuncs.isIdentical(set1, set2, wholeFieldComparator)) {
				return SURE;
			}

			// ISSN check could handle cases when there is a typo (determined by tarkistusnumero)


			//if other set is subset of the other, then we are sure
			if (compareFuncs.isSubset(set1, set2, wholeFieldComparator) || 
				compareFuncs.isSubset(set2, set1, wholeFieldComparator)) {
				return ALMOST_SURE;
			}


			return SURELY_NOT;
		}

		return {
			check: check,
			getData: getData
		};
	}

	function hasSubfield(set, codes) {
		var codes = codes.split('');

		var has = false;
		set.forEach(function(field) {
			field.subfield.forEach(function (sub) {
				if (codes.indexOf(sub.$.code) !== -1) {
					has = true;
				}
			});
		});
		return has;
	}

	function getSubfield(field, code) {
		var subfields = getSubfields(field,code);
		if (subfields.length > 1) throw new Error("Record has multiple subfields of code: " + code);
		return subfields[0];
	}

	function getSubfields(field, code) {
		var subfields = field.subfield.filter(function(subfield) { return subfield.$.code == code; });
		return _.pluck(subfields,'_');
	}

	function setVerbose(verbose) {
		VERBOSE = verbose;
	}

	function log(msg) {
		if (VERBOSE) {
			console.log(msg);
		}
	}


	this.setVerbose = setVerbose;
	this.compareRecords = compareRecords;

}


function normalize(param, normalizerArray, options) {
	options = options || {};
	
	return _.reduce(normalizerArray, singleNormalize(options), param);
}

function singleNormalize(options) {
	return function (param, normalizer) {
		if (_.isFunction(normalizer)) {
			return normalizer.call(this, param, options);
		}
		if (_.isString(normalizer)) {

			var func = eval(sprintf("normalizeFuncs.%s", normalizer));
			return func.call(this, param, options);
		}
	}
}

function compare(comparator, param1, param2) {
	if (_.isFunction(comparator)) {
		return comparator.call(this, param1, param2);
	}
	if (_.isString(comparator)) {
		return compareFuncs[comparator].call(this, param1, param2);
	}
}

function select(selectors, record) {
	var selections = _.flatten( _.map(selectors, filter(record)) );
	
	return selections;

}

function filter(record, selector) {
	return function(selector) {

		if (_.isFunction(selector)) {
			return selector.call(this, record);
		}

		if (_.isString(selector)) {

			try {
				var func = eval(selector);

				return func.call(null, selector, record);
			} catch(e) {

				return filterFuncs.stringSelector(selector, record);
			}
			
		}
	};
}

function clone(a) {
   return JSON.parse(JSON.stringify(a));
}


module.exports = Similarity;


