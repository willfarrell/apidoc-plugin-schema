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
        app.log.debug('apischema.path',values.path);
		if (schemas[values.schema]) {
			var data = fs.readFileSync( path.join(path.dirname(filename), values.path), 'utf8').toString();
			var new_elements = schemas[values.schema](data, values.element, app.parser.parsers[values.element.toLowerCase()]);

			// do not use concat
			for(var i = 0,l=new_elements.length; i<l;i++) {
				elements.push(new_elements[i]);
			}
		}
    }
    return elements;
}