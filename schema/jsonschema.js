

function exists(keys, key) {
	return keys.indexOf(key) !== -1;
}

function formatType(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// TODO change _OR_ to |, requires core fix to allow `Empty parser result.`
function makeType(param) {
	//console.log(param);
	var strarr = [];
	if (param.format) {
	    strarr.push(formatType(param.format));
	    if ( Array.isArray(param.type) && param.type.indexOf('null') !== -1 ) {
            strarr.push('Null');
	    }
	    return strarr.join('_OR_');
	}
	var str = '';
	if (Array.isArray(param.type)) {
        param.type.map(function(type){
            str = param.type;
            if (str === 'array') {
                str = param.items.type+'[]';
            }
            strarr.push(formatType(str));
        });
        return strarr.join('_OR_');
	} else {
	    str = param.type
	    if (str === 'array') {
    		str = param.items.type+'[]';
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
	
	return (Array.isArray(param.enum)) ? '='+param.enum.join(',') : '';
}

function isRequired(schema, key) {
	if (schema.type === 'array') { schema = schema.items; }
	// TODO figure out way to display when anyOf, oneOf
	return exists(Object.keys(schema),'required') && (schema.required.indexOf(key) !== -1);
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


function traverse(schema, p) {
	var params = {};
	
	// Case: apiSuccess returns an array
	/*if (!p && schema.type === 'array'){
		params['data'] = '{array} data';
		p = 'data[]';
	}*/
	
	p = p || '';
	var group = p ? '('+p+') ' : '';
	
	var properties = {};
	//schema = mergeAllOf(schema);
	if (schema.type === 'object'){
		properties = schema.properties;
	} else if (schema.type === 'array' && !schema.items) { // catch errors
	    throw SyntaxError('ERROR: schema array missing items');
	} else if (schema.type === 'array' && schema.items.type === 'object') {
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
		var field = key;

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
		
		// make group
		params[key] = group+'{'+type+size+allowedValues+'} '+field+' '+description;
		
		var subs = {};
		//var subgroup = p ? p+'.' : ''; // TODO apidoc - groups cannot have `.` in them
		if (param.type === 'array' && param.items.type === 'object') {
			subs = traverse(param.items, key+'[]'); // subgroup+
		} else if (param.type === 'object') {
			subs = traverse(param, key); // subgroup+
		}
		for(var subKey in subs) {
			if (!subs.hasOwnProperty(subKey)) { continue; }
			params[key+'.'+subKey] = subs[subKey];
		}
	}

	return params;
}

var $RefParser = require('json-schema-ref-parser');
function build (data, element) {
	data = JSON.parse(data);
	
	// run sync - https://github.com/BigstickCarpet/json-schema-ref-parser/issues/14
	var elements = [], done = false;
	$RefParser.dereference(data, function(err, schema) {
		if (err) {
			console.error(err);
			done = true;
			return;
		}
		//console.log('start',schema); 
		var lines = traverse(schema);
		for(var l in lines) {
			if (!lines.hasOwnProperty(l)) { continue; }
			elements.push({ source: '@'+element+' '+lines[l]+'\n',
				name: element.toLowerCase(),
				sourceName: element,
				content: lines[l]+'\n'
			});
		}
		done = true;
	});
	require('deasync').loopWhile(function(){return !done;});
	//console.log('generated', elements);
	return elements;
}

module.exports = build;