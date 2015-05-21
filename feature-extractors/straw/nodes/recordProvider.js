var sprintf = require('sprintf').sprintf;
var straw = require('straw');
var fs = require('fs');

module.exports = straw.node({

	process: function(msg, done) {

		var dataProvider = this.dataProvider.bind(this);

		var id1 = msg[0];
		var id2 = msg[1];

		this.output({
			record1: dataProvider(id1),
			record2: dataProvider(id2)
		}, done);
	},

	dataProvider: function(id) {

		var file = sprintf("%s/%s.xml", this.opts.config.fromDirectory, id);
		return fs.readFileSync(file, 'utf8');
	}

});
