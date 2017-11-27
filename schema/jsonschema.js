

function exists(keys, key) {
	return keys.indexOf(key) !== -1;
}

function formatType(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// TODO change / to |, requires core fix to allow `Empty parser result.`
// https://github.com/apidoc/apidoc-core/blob/master/lib/parsers/api_param.js
function makeType(param) {
	//console.log('makeType',param);
	param = Array.isArray(param)? param[0]: param;
	var strarr = [];
	if (param.format) {
	    strarr.push(formatType(param.format));
	    if ( Array.isArray(param.type) && param.type.indexOf('null') !== -1 ) {
            strarr.push('Null');
	    }
	    return strarr.join('/');
	}
	var str = '';
	if (Array.isArray(param.type)) {
        param.type.map(function(type){
            str = type;
            if (str === 'array') {
                str = makeType(param.items)+'[]';
            }
            strarr.push(formatType(str));
        });
        return strarr.join('/');
	} else if (param.type) {
	    str = param.type
	    if (str === 'array') {
    		str = makeType(param.items)+'[]';
    	}
    	return formatType(str);
	}

	return 'Unknown';
}

function makeSize(param) {
	if (param.type === 'array') { param = param.items; }

	var keys = Object.keys(param);
	var str = '';

	if (param.type === 'string' && (exists(keys,'minLength') || exists(keys,'maxLength'))) {

		if ( exists(keys,'minLength') && exists(keys,'maxLength') && param.minLength === param.maxLength ) {
			return '{'+param.minLength+'}';
		}

		str = '{';
		if (exists(keys,'minLength')) {
			str += param.minLength;
		}
		str += '..';
		if (exists(keys,'maxLength')) {
			str += param.maxLength;
		}
		str += '}';
	} else if ( (param.type === 'integer' || param.type === 'number') && (exists(keys,'minimum') || exists(keys,'maximum')) ) {

		if ( exists(keys,'minimum') && exists(keys,'maximum') && param.minimum === param.maximum ) {
			return '{'+param.minimum+'}';
		}

		str = '{';
		if (exists(keys,'minimum')) {
			str += param.minimum;
		} else {
			str += '-∞';
		}
		str += ' - ';
		if (exists(keys,'maximum')) {
			str += param.maximum;
		} else {
			str += '∞';
		}
		str += '}';
	}

	return str;
}

function makeAllowedValues(param) {
	if (param.type === 'array') { param = param.items; }

	// convert null,true,false to string, add quotes to strings
	if ( !Array.isArray(param.enum) ) { return ''; }

	let values = [];
	param.enum = param.enum.map((item) => {
		if (typeof item === 'string') {
			values.push('"'+item+'"'); // ensures values with spaces render properly
		} else if (typeof item === 'number') {
                        values.push(item.toString());
                } else if (item === null) {
			// required to be at beginning
			values.unshift('null');
		} else if (item === true) {
			// required to be at beginning
			values.unshift('true');
		} else if (item === false) {
			// required to be at beginning
			values.unshift('false');
		}
		return item;
	});

	return '='+values.join(',');
}

function isRequired(schema, key) {
	if (schema.type === 'array') { schema = schema.items; }

	// TODO figure out way to display when anyOf, oneOf
	return (exists(Object.keys(schema),'required') && (schema.required.indexOf(key) !== -1)) ||
					(exists(Object.keys(schema.properties), key) && schema.properties[key].required);
}

// NOTE this is not proper jsonschema, likely in v5 w/ merge
// var merge = require('lodash/fp/merge');
/*function mergeAllOf(schema) {
	// TODO update https://github.com/json-schema/json-schema/issues/116
	if (exists(Object.keys(schema),'allOf')) {
		for(var i = schema.allOf.length; i--;) {
			schema.allOf[i] = mergeAllOf(schema.allOf[i]);

			var required = schema.required || [];
			required = required.concat(schema.allOf[i].required || []);
			schema = merge(schema, schema.allOf[i]);
			if (required.length) schema.required = required;
		}
		delete schema.allOf;
	}
	return schema;
}*/


function traverse(schema, p, group) {
	var params = {};

	// Case: apiSuccess returns an array
	/*if (!p && schema.type === 'array'){
		params['data'] = '{array} data';
		p = 'data[]';
	}*/

	p = p || '';


	var properties = {};
	//schema = mergeAllOf(schema);
	if (isType(schema.type, 'object')){
		properties = schema.properties;
	} else if (isType(schema.type, 'array') && !schema.items) { // catch errors
	  throw SyntaxError('ERROR: schema array missing items');
	} else if (isType(schema.type, 'array') && schema.items.type === 'object') {
		//schema.items = mergeAllOf(schema.items);
		properties = schema.items.properties;
	}

	//console.log('properties',properties);

	for(var key in properties) {
		if (!properties.hasOwnProperty(key)) { continue; }
		var param = properties[key];
		//console.log('param',param);
		if (!param) { continue; }

		var type = makeType(param);
		var size = makeSize(param);
		var allowedValues = makeAllowedValues(param);

		var description = param.description;
		if (param.type === 'array') {
			description += ' '+param.items.description;
		}

		// make field
		var parent = p ? p + '.':'';
		var field = parent + key;

		if (exists(Object.keys(param),'default')) {
			if (typeof param.default === 'object') {
				field += '=\''+JSON.stringify(param.default)+'\'';
			} else {
				field += '='+param.default;
			}
		}

		if ( !isRequired(schema, key) ) {
			field = '['+field+']';
		}

		if (p) key = p + '.' + key;
		var g = group ? '('+group+') ' : '';
		// make group
		params[key] = g+'{'+type+size+allowedValues+'} '+field+' '+description;
		//console.log(parent+key, params[parent + key])
		var subs = {};
		//var subgroup = p ? p+'.' : ''; // TODO apidoc - groups cannot have `.` in them
		if (isType(param.type, 'array') && param.items.type === 'object') {
			subs = traverse(param.items, key, group); // subgroup+
		} else if (isType(param.type, 'object')) {
			subs = traverse(param, key, group); // subgroup+
		}
		for(var subKey in subs) {
			if (!subs.hasOwnProperty(subKey)) { continue; }
			params[key+'.'+subKey] = subs[subKey];
		}
	}

	return params;
}

function isType(types, type) {
	if (Array.isArray(types)) {
		return types.indexOf(type) !== -1;
	} else {
		return types === type;
	};
}

var $RefParser = require('json-schema-ref-parser');
function build (relativePath, data, element, group) {
	data = JSON.parse(data);

	// run sync - https://github.com/BigstickCarpet/json-schema-ref-parser/issues/14
	var elements = [], done = false;
	$RefParser.dereference(relativePath, data, {}, function(err, schema) {
		if (err) {
			console.error(err);
			done = true;
			return;
		}
		var lines = traverse(schema, null, group);
		for(var l in lines) {
			if (!lines.hasOwnProperty(l)) { continue; }

			var res = {
				source: '@'+element+' '+lines[l]+'\n',
				name: element.toLowerCase(),
				sourceName: element,
				content: lines[l]+'\n'
			};
			elements.push(res);
		}
		done = true;
	});
	require('deasync').loopWhile(function(){return !done;});
	//console.log('generated', elements);
	return elements;
}

module.exports = build;
