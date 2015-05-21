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
