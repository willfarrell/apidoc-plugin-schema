var filename = __filename;

var element = {
	source:'@apiSchema',
	content:'{jsonschema=./sample/jsonschema.json} apiParam'
};

var plugin = require('./');
console.log(plugin(element, filename));