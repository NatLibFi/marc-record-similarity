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
"use strict";

var sprintf = require('sprintf').sprintf;
var straw = require('straw');
var printer = require('../../core.print');
var fs = require('fs');

module.exports = straw.node({

	headerIsPrinted: false,
	
	initialize: function(opts, done) {
		var outFile = this.opts.config.outputFile;

		if (fs.existsSync(outFile)) {

			fs.unlink(outFile, done);

		} else {

			done(false);

		}
	},
	
	start: function(done) {
		console.log("Output goes to: " + this.opts.config.outputFile);
	},

	process: function(msg, done) {
		

		fs.appendFileSync(this.opts.config.outputFile, msg + "\n");
		
		this.output(msg, done);
		
	}

});
