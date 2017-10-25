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
//core.filter.js

var _ = require('underscore');

function stringSelector(selector, record) {

	record = clone(record);

	if (selector.length >= 3) {
		while (selector.length < 5) {
			selector += ".";
		}
		//tag selector
		var res = [];
		
		res = res.concat( _.map(record.controlfield, hTag(selector)) );
		res = res.concat( _.map(record.datafield, hTag(selector)) );
	
		return res;
	}

}

function clone(a) {
   return JSON.parse(JSON.stringify(a));
}


function hTag(selector) {
	return function(field) {
		var res = [];
		var sel = selector.substr(0,3);
		var ind1 = selector.substr(3,1);
		var ind2 = selector.substr(4,1);
		var subfields = selector.substr(5);

		if (field.$.tag == sel) {
			if (new RegExp('^'+ind1+'?$').test(field.$.ind1) && 
				new RegExp('^'+ind2+'?$').test(field.$.ind2)) {
				
				filterSubfields(field, subfields);

				res.push(field);
			}
		}
		return res;
	};
}

function filterSubfields(field, subfields) {
	if (subfields === '') {
		return;
	}

	
	subfields = subfields.split('');

	var unSelectedSubfields = field.subfield.filter(function(subfield) {
		return (subfields.indexOf(subfield.$.code) == -1);
	});
	field.subfield = _.difference(field.subfield, unSelectedSubfields);

}

module.exports = {
	stringSelector: stringSelector
};
