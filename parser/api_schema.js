var trim = require('trim');

function parse(content) {
	content = trim(content);

	if (content.length === 0)
		return null;
	
	// @apiSchema (optional group) {jsonschema=relative_path} additional_argument
	var parseRegExp = /^(?:\((.+?)\)){0,1}\s*\{(.+?)=(.+?)\}\s*(?:(.+))?/g;
	var matches = parseRegExp.exec(content);

	if ( ! matches)
		return null;

	return {
		group: matches[1],
		schema : matches[2],
		path : matches[3],
		element : matches[4] || 'apiParam',
	};
}

/**
 * Exports
 */
module.exports = {
	parse        : parse,
	path         : 'local',
	method       : 'push',
	preventGlobal: true
};
