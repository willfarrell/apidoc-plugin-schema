const fs = require('fs');
const path = require('path');

const elementParser = require('./parser/api_schema');
const schemas = {
	'jsonschema': require('./schema/jsonschema')
};

let app = {};

module.exports = {
	init: function(_app) {
		app = _app;
		app.addHook('parser-find-elements', parserSchemaElements, 200);
	}
};

function parserSchemaElements(elements, element, block, filename) {
	if ( element.name !== 'apischema' ) { return elements; }
	elements.pop();

	const values = elementParser.parse(element.content, element.source);
	app.log.debug('apischema.path',values.path);
	if (schemas[values.schema]) {
		const relative_path = path.join(path.dirname(filename), values.path);
		const data = fs.readFileSync(relative_path, 'utf8').toString();
		const new_elements = schemas[values.schema](relative_path, data, values.element, values.group);

		// do not use concat
		for(let i = 0,l=new_elements.length; i<l;i++) {
			elements.push(new_elements[i]);
		}
	}
	return elements;
}
