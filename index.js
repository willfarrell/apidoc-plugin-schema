var fs = require('fs');
var path = require('path');

var elementParser = require('./parser/api_schema');
var schemas = {
	'jsonschema': require('./schema/jsonschema')
};

var app = {};

module.exports = {

    init: function(_app) {
        app = _app;
        app.addHook('parser-find-elements', parserSchemaElements);
    }

};

function parserSchemaElements(elements, element, block, filename) {
    if ( element.name === 'apischema' ) {
		//app.log.verbose('element',element);
        elements.pop();

        var values = elementParser.parse(element.content, element.source);
        //app.log.verbose('element.values',values);
		if (schemas[values.schema]) {
			var data = fs.readFileSync( path.join(path.dirname(filename), values.path), 'utf8').toString();
			elements.concat(schemas[values.schema](data, values.element));
		}
    }
    return elements;
}