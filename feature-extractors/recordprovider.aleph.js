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
/* jshint node:true */
"use strict";

var http = require('http');
var Q = require('q');
var sprintf = require('sprintf').sprintf;
var path = require('path');

var xslt = require('node_xslt');
var stylesheet = xslt.readXsltFile(path.resolve(__dirname, "OAIMARC2MARC21slim.xsl"));

function init(config) {

	function getRecord(id) {

		var url = sprintf("%s/X?op=find-doc&base=%s&show_subfield_6=y&doc_num=%s", config.host, config.base, id);

		var deferred = Q.defer();

		http.get(url, function(res) {

			res.setEncoding('utf8');
			var body = "";
			res.on('data', function(chunk) {

				body += chunk;
			});
			res.on('end', function() {
				var doc = xslt.readXmlString(body);
				var transformedString = xslt.transform(stylesheet, doc, []);
				deferred.resolve(transformedString);
		
			});

		}).on('error', function(e) {
			deferred.reject(e);
		});

		return deferred.promise;
	}
	
	return {
		getRecord: getRecord
	};
}

module.exports = init;
