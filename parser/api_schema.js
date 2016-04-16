var trim = require('trim');

function parse(content) {
	content = trim(content);

	if (content.length === 0)
		return null;
	
	// @apiSchema {jsonschema=relative_path} additional_argument
	var parseRegExp = /^\{(.+?)=(.+?)\}\s*(?:\s+(.+?))?$/g;
	var matches = parseRegExp.exec(content);

	if ( ! matches)
		return null;

	return {
		schema : matches[1],
		path : matches[2],
		args : matches[3].split(',') || ['apiParam']
	};
}

/**
 * Exports
 */
module.exports = {
	parse        : parse,
	path         : 'local.schema',
	method       : 'push',
	preventGlobal: true
};
