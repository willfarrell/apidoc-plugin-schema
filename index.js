var fs = require('fs');
var path = require('path');

var elementParser = require('./parser/api_schema');
var schemas = {
	'jsonschema': require('./schema/jsonschema')
};

module.exports = function(element, filename) {
	var values = elementParser.parse(element.content, element.source);
	var schema = fs.readFileSync( path.join(path.dirname(filename), values.path), 'utf8').toString();
	if (schemas[values.schema]) {
		return schemas[values.schema](schema, values.args);
	}
	return '';
};