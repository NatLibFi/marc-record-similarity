/*jshint mocha:true*/
"use strict";
var chai = require('chai');
var expect = chai.expect;

var compareFuncs = require('../core.compare');

describe('Compare', function() {

	describe('stringJaccard', function() {

		var stringJaccard = compareFuncs.stringJaccard;
		
		it('should work for strings', function() {
			var str1 = "123";
			var str2 = "234";		

			expect(stringJaccard(str1, str2)).to.equal(0.5);
		});
		it('should not be concerned about string order', function() {
			var str1 = "321";
			var str2 = "234";		

			expect(stringJaccard(str1, str2)).to.equal(0.5);
		});
		it('should give zero if strings have 0 similar characters', function() {
			var str1 = "abc";
			var str2 = "def";		

			expect(stringJaccard(str1, str2)).to.equal(0);
		});
		it('should give 1 if strings are identical', function() {
			var str1 = "abc";
			var str2 = "abc";		

			expect(stringJaccard(str1, str2)).to.equal(1);
		});
		it('should calculate jaccard correctly', function() {
			var str1 = "abcx";
			var str2 = "abcz";		

			expect(stringJaccard(str1, str2)).to.equal(0.6);
		});
	});

	describe('setCompare', function() {

		it('should return 1 if sets have at least one identical element', function() {
			expect(compareFuncs.setCompare([1,2,3],[3,4,5])).to.equal(1);
		});
		it('should return 0 if sets have at no identical elements', function() {
			expect(compareFuncs.setCompare([1,2,3],[4,5,6])).to.equal(0);
		});

	});

	describe('isIdentical', function() {
	


		it('should return true for identical fields', function() {
			expect( compareFuncs.isIdentical(gfset(['a','b','c']), gfset(['a','b','c']))).to.be.true;
		});
		it('should return true for identical unordered fields', function() {
			expect( compareFuncs.isIdentical(gfset(['c','a','b']), gfset(['a','b','c']))).to.be.true;
		});
	});

	function gfset(values) {
		var fieldMock = [];
		values.forEach(function(value) {
			fieldMock.push({
				subfield: [
					{'_': value, '$': { 'code': 'a'}}
				]
			});
		});
		
		return fieldMock;
	}

	function gf(value) {
		return [{
			subfield: [
				{'_': value, '$': { 'code': 'a'}}
			]
		}];
	}

	describe('isIdentical with abbreviation equal function', function() {


		it('should return true for names with abbreviations', function() {
			expect( compareFuncs.isIdentical(gf('KURT VÄINÖ WALLER'), gf('KURT V WALLER'), compareFuncs.abbrComparator)).to.be.true;
		});
		
		it('should return true for names with multiple abbreviations', function() {
			expect( compareFuncs.isIdentical(gf('A B CDE'), gf('ABC BCD CDE'), compareFuncs.abbrComparator)).to.be.true;
		});
		it('should return false if all the elements in either name are abbreviations', function() {
			expect( compareFuncs.isIdentical(gf('A B C'), gf('ABC BCD CDE'), compareFuncs.abbrComparator)).to.be.false;
		});		

		it('should return true for names with abbreviations and normal forms starting same char', function() {
			expect( compareFuncs.isIdentical(gf('A AALTO ARTTU'), gf('AALTO ARTTU ASKO'), compareFuncs.abbrComparator)).to.be.true;
		});
			
		it('should return false if there is different amount of elements', function() {
			expect( compareFuncs.isIdentical(gf('A'), gf('AALTO ARTTU ASKO'), compareFuncs.abbrComparator)).to.be.false;
		});

		it('should return false for isSubset if there is not proper item for each token in both strings', function() {
			expect( compareFuncs.isSubset(gf('H MERIMIES'), gf('HARRY HALEN'), compareFuncs.abbrComparator)).to.be.false;
		});
		it('should return false for isSubset if there is not proper item for each token in both strings other way around', function() {
			expect( compareFuncs.isSubset(gf('HARRY HALEN'), gf('H MERIMIES'), compareFuncs.abbrComparator)).to.be.false;
		});

		it('should return true for multiple fields', function() {
			var rec1 = gf('AALTO A ARTTU').concat( gf('JIRI J JAKO') );
			var rec2 = gf('AALTO ASKO ARTTU').concat( gf('JIRI JOUKO JAKO') );
			expect( compareFuncs.isIdentical(rec1, rec2, compareFuncs.abbrComparator)).to.be.true;
		});

		it('should return false for multiple fields if not identical', function() {
			var rec1 = gf('AALTO A ARTTU').concat( gf('JIRI J JAKO') );
			var rec2 = gf('AALTO ASKO ARTTU').concat( gf('JIRI JOUKO XX') );
			expect( compareFuncs.isIdentical(rec1, rec2, compareFuncs.abbrComparator)).to.be.false;
		});
	});

	describe('isIdentical with levenhstein equal function', function() {
		


		it('should return true for names with abbreviations and normal forms starting same char', function() {
			expect( compareFuncs.isIdentical(gf('AALTO'), gf('AALTO'), compareFuncs.lvComparator(1))).to.be.true;
		});
		it('should return true for names with abbreviations and normal forms starting same char', function() {
			expect( compareFuncs.isIdentical(gf('BALTO'), gf('AALTO'), compareFuncs.lvComparator(0.8))).to.be.true;
		});
		it('should return false if the items do not have at least 80% same characters', function() {
			expect( compareFuncs.isIdentical(gf('11112'), gf('22222'), compareFuncs.lvComparator(0.8))).to.be.false;
		});

		it('should return true for multiple fields', function() {
			var rec1 = gf('AALTO').concat( gf('JIRI') );
			var rec2 = gf('AALTO').concat( gf('JIRI') );
			expect( compareFuncs.isIdentical(rec1, rec2, compareFuncs.lvComparator(1))).to.be.true;
		});
		it('should return true for multiple fields', function() {
			var rec1 = gf('AALTOX').concat( gf('JIRIX') );
			var rec2 = gf('AALTO').concat( gf('JIRI') );
			expect( compareFuncs.isIdentical(rec1, rec2, compareFuncs.lvComparator(0.8))).to.be.true;
		});
	});

	describe('isIdentical with stringPartOf equal function', function() {
		it('should return true if names are equal', function() {
			expect( compareFuncs.isIdentical(gf('AALTO'), gf('AALTO'), compareFuncs.stringPartofComparator)).to.be.true;
		});
		it('should return true if other starts with another', function() {
			expect( compareFuncs.isIdentical(gf('AALTO'), gf('AALTO J'), compareFuncs.stringPartofComparator)).to.be.true;
		});
		it('should return false if other is 40% or less the length of another', function() {
			expect( compareFuncs.isIdentical(gf('1234'), gf('1234567890'), compareFuncs.stringPartofComparator)).to.be.false;
		});
		it('should return true if first is in the middle of the second', function() {
			expect( compareFuncs.isIdentical(gf('CHARLES DAVIES PAUL WILLIAM'), gf('DAVIES PAUL'), compareFuncs.stringPartofComparator)).to.be.true;
		});
		it('should return true if second is in the middle of the first', function() {
			expect( compareFuncs.isIdentical(gf('DAVIES PAUL'), gf('CHARLES DAVIES PAUL WILLIAM'), compareFuncs.stringPartofComparator)).to.be.true;
		});
		it('should return false if another is not part of the other', function() {
			expect( compareFuncs.isIdentical(gf('DAVIES PAUL'), gf('AALTO J'), compareFuncs.stringPartofComparator)).to.be.false;
		});

		it('should return true for multiple fields', function() {
			var rec1 = gf('AALTO A').concat( gf('JIRI J') );
			var rec2 = gf('AALTO ARTTU').concat( gf('JIRI JOUKO') );
			expect( compareFuncs.isIdentical(rec1, rec2, compareFuncs.stringPartofComparator)).to.be.true;
		});


	});

	describe('hasIntersection', function() {
		it('should return true if fields are equal', function() {
			expect( compareFuncs.hasIntersection(gf('AALTO'), gf('AALTO'))).to.be.true;
		});

		it('should return false if fields are not equal', function() {
			expect( compareFuncs.hasIntersection(gf('AALTO UNIV'), gf('AALTO'))).to.be.false;
		});

		it('should return true if have intersecting value', function() {
			expect( compareFuncs.hasIntersection(gfset(['SINI', 'AALTO']), gfset(['SIN', 'AALTO']))).to.be.true;
		});
		
		it('should return true if sets are identical', function() {
			expect( compareFuncs.hasIntersection(gfset(['SINI', 'AALTO']), gfset(['SINI', 'AALTO']))).to.be.true;
		});
		it('should return false if first set is empty', function() {
			expect( compareFuncs.hasIntersection(gfset([]), gfset(['SINI', 'AALTO']))).to.be.false;
		});
		it('should return false if second set is empty', function() {
			expect( compareFuncs.hasIntersection(gfset(['SINI', 'AALTO']), gfset([]))).to.be.false;
		});
		it('should return false if both sets are empty', function() {
			expect( compareFuncs.hasIntersection(gfset([]), gfset([]))).to.be.false;
		});
	});
});