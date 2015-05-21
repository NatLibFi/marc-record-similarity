/*jshint mocha:true*/
"use strict";

var chai = require('chai');
var expect = chai.expect;
var _ = require('underscore');

var normalizeFuncs = require('../core.normalize');
var toString = normalizeFuncs.toString;
	

function gf(value) {
	return [{
		subfield: [
			{'_': value, '$': { 'code': 'a'}}
		]
	}];
}


describe('Normalize functions', function() {

	// The field mocks have all other data left out, so there is only subfields.
	var testFields = [{
		subfield: [
			{'_': 'subfield-A content', '$': { 'code': 'a'}},
			{'_': 'subfield B-content', '$': { 'code': 'b'}},
		]
	}];

	var testFields2 = [
		{
			subfield: [
				{'_': 'subfield-a-content', '$': { 'code': 'a'}},
				{'_': 'subfield-b-content', '$': { 'code': 'b'}},
			]
		},{
			subfield: [
				{'_': 'subfield-a-content', '$': { 'code': 'a'}},
				{'_': 'subfield-b-content', '$': { 'code': 'b'}},
			]
		}
	];


	describe('toString', function() {

		var toString = normalizeFuncs.toString;

		
		it('should turn fields into array of strings', function() {
			var testData = _.clone(testFields);

			expect(toString(testData)).to.be.instanceof(Array);
		});


		it('2 subfields should turn into array of 2 elements', function() {
			var testData = _.clone(testFields);

			expect(toString(testData)).to.have.length(2);
		});
		

		it('2 fields with 2 subfields should turn into array of 4 elements.', function() {
			var testData = _.clone(testFields2);

			expect(toString(testData)).to.have.length(4);
		});

		it('should have the content of subfield as values', function() {
			var testData = _.clone(testFields);

			expect(toString(testData)).to.include('subfield-A content');
			expect(toString(testData)).to.include('subfield B-content');

		});

	});

	describe('lowercase', function() {
		var lowercase = normalizeFuncs.lowercase;
		var toString = normalizeFuncs.toString;

		it('should return an array of lowercase versions', function() {
			var testData = _.clone(testFields);
		
			expect(lowercase(toString(testData))).to.include('subfield-a content');
			expect(lowercase(toString(testData))).to.include('subfield b-content');

		});

	});

	describe('join', function() {
		var join = normalizeFuncs.join;
		var toString = normalizeFuncs.toString;
		
		it('should join an array into single string', function() {
			var testData = _.clone(testFields);
		
			expect(join(toString(testData))).to.equal('subfield-A contentsubfield B-content');
			

		});

	});
	describe('delChars', function() {
		var delChars = normalizeFuncs.delChars;
		
		it('should remove all spaces from array elements', function() {
			var testData = _.clone(testFields);
		
			expect(toString(delChars(" ")(testData))).to.include('subfield-Acontent');
			expect(toString(delChars(" ")(testData))).to.include('subfieldB-content');

		});

	});
	describe('utf8norm', function() {

		//nfc=Canonical Decomposition, followed by Canonical Composition
		it('should normalize utf8 characters to nfc', function() {
			expect( toString(normalizeFuncs.utf8norm(gf("ÁÑ"))) ).to.include('ÁÑ');
		});
	});
	describe('removediacs', function() {
		it('should remove diacritics from string in utf8-nfc from', function() {
			expect( toString(normalizeFuncs.removediacs(gf("ÁÑ"))) ).to.include('AN');
		});
	});
	describe('toSpace', function() {
		it('should change - to space', function() {
			expect( toString(normalizeFuncs.toSpace("-")(gf("AB-CD"))) ).to.include('AB CD');
		});

		
	});

	describe.only('parsePageInfo', function() {

		it('should return PageInfo -object', function() {
			expect( normalizeFuncs.parsePageInfo("138 s.")).to.be.object;

		});
		it('should return PageInfo -object with start and end properties', function() {
			var pageInfo = normalizeFuncs.parsePageInfo("138 s.");

			expect( pageInfo ).to.have.keys(['start', 'end', 'str', 'total']);

		});

		it('should return PageInfo -object with correct start and end properties', function() {
			var pageInfo = normalizeFuncs.parsePageInfo("138 s.");

			expect( pageInfo.start ).to.equal(0);
			expect( pageInfo.end ).to.equal(138);
			expect( pageInfo.total ).to.equal(138);


		});
		it('should return PageInfo -object with correct start and end properties for page ranges', function() {
			var pageInfo = normalizeFuncs.parsePageInfo("S. 123-179.");

			expect( pageInfo.start ).to.equal(123);
			expect( pageInfo.end ).to.equal(179);

		});
		it('should return PageInfo -object with correct start and end properties for page ranges with [] -chars', function() {
			var pageInfo = normalizeFuncs.parsePageInfo("Ss [348]-593");

			expect( pageInfo.start ).to.equal(348);
			expect( pageInfo.end ).to.equal(593);

		});

		it('handle roman numerals', function() {
			var pageInfo = normalizeFuncs.parsePageInfo("XI, 373 s.");

			expect( pageInfo.start ).to.equal(0);
			expect( pageInfo.end ).to.equal(373);
			expect( pageInfo.total ).to.equal(384);

		});
		
		it('should prefer items that are not in parenthesis', function() {
			var pageInfo = normalizeFuncs.parsePageInfo("(2) s., s. 519-590, (5) s. ");

			expect( pageInfo.start ).to.equal(519);
			expect( pageInfo.end ).to.equal(590);
			expect( pageInfo.total ).to.equal(71);

		});
		it('should prefer items that are not in parenthesis', function() {
			var pageInfo = normalizeFuncs.parsePageInfo("(2) s., s. 431, (5) s. ");

			expect( pageInfo.start ).to.equal(0);
			expect( pageInfo.end ).to.equal(431);
			expect( pageInfo.total ).to.equal(431);

		});

		it('should prefer items that are not in parenthesis', function() {
			var pageInfo = normalizeFuncs.parsePageInfo("vii s., s. 81-230, [2]  :");

			expect( pageInfo.start ).to.equal(81);
			expect( pageInfo.end ).to.equal(230);
			expect( pageInfo.total ).to.equal(149);

		});
		it('should use largest page count in the string', function() {
			var pageInfo = normalizeFuncs.parsePageInfo("v, 443, 8 s.");

			expect( pageInfo.start ).to.equal(0);
			expect( pageInfo.end ).to.equal(443);
			expect( pageInfo.total ).to.equal(448);

		});

		
		it('should return null for data that contains something else than characters s,p or roman numerals or numbers', function() {
			var pageInfo = normalizeFuncs.parsePageInfo("a1 kirja (63 s.), 1 CD-äänilevy ;");

			expect( pageInfo ).to.be.null;

		});
		
	});
	
});