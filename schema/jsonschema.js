const deasync = require('deasync-promise');
const $RefParser = require('json-schema-ref-parser');

/**
 * Capitalize the first letter in a header
 *
 * @param {string} str String to Titlecase
 */
function formatType(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// TODO change / to |, requires core fix to allow `Empty parser result.`
// https://github.com/apidoc/apidoc-core/blob/master/lib/parsers/api_param.js
function makeType(param) {
    param = Array.isArray(param)? param[0]: param;
    const strarr = [];

    if (param.format) {
        strarr.push(formatType(param.format));
        if (Array.isArray(param.type) && param.type.indexOf('null') !== -1) {
            strarr.push('Null');
        }
        return strarr.join('/');
    }

    let str = '';

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

/**
 * Return an apidoc formatted size parameter
 *
 * Min/Max Examples:
 * "{-∞ - 8}"
 * "{8}"
 * "{8 - ∞}"
 *
 * Length Examples
 * "{5}"
 * "{..1}"
 * "{2..6}"
 * "{1..}"
 */
function makeSize(param) {
    if (param.type === 'array') { param = param.items; }

    const keys = Object.keys(param);
    let str = '';

    if (param.type === 'string' && (keys.includes('minLength') || keys.includes('maxLength'))) {
        if ( keys.includes('minLength') && keys.includes('maxLength') && param.minLength === param.maxLength ) {
            return '{'+param.minLength+'}';
        }

        str = '{';
        if (keys.includes('minLength')) str += param.minLength;

        str += '..';
        if (keys.includes('maxLength')) str += param.maxLength;

        str += '}';
    } else if ( (param.type === 'integer' || param.type === 'number') && (keys.includes('minimum') || keys.includes('maximum')) ) {

        if ( keys.includes('minimum') && keys.includes('maximum') && param.minimum === param.maximum ) {
            return '{'+param.minimum+'}';
        }

        str = '{';
        if (keys.includes('minimum')) {
            str += param.minimum;
        } else {
            str += '-∞';
        }
        str += ' - ';
        if (keys.includes('maximum')) {
            str += param.maximum;
        } else {
            str += '∞';
        }
        str += '}';
    }

    return str;
}

function makeAllowedValues(param) {
    if (param.type === 'array') param = param.items;

    // convert null,true,false to string, add quotes to strings
    if (!Array.isArray(param.enum)) return '';

    const values = [];
    param.enum = param.enum.map((item) => {
        if (typeof item === 'string') {
            values.push(`"${item}"`); // ensures values with spaces render properly
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

    return '=' + values.join(',');
}

function isRequired(schema, key) {
    if (schema.type === 'array') schema = schema.items;

    // TODO figure out way to display when anyOf, oneOf
    return (Object.keys(schema).includes('required') && Array.isArray(schema.required) && (schema.required.includes(key))) ||
                    (Object.keys(schema.properties).includes(key) && (typeof schema.properties[key].required === 'boolean') && schema.properties[key].required);
}

function traverse(schema, p, group) {
    let params = {};

    p = p || '';

    let properties = {};

    if (isType(schema.type, 'object')){
        properties = schema.properties;
    } else if (isType(schema.type, 'array') && !schema.items) { // catch errors
      throw SyntaxError('ERROR: schema array missing items');
    } else if (isType(schema.type, 'array') && schema.items.type === 'object') {
        //schema.items = mergeAllOf(schema.items);
        properties = schema.items.properties;
    }

    for (var key in properties) {
        if (!properties.hasOwnProperty(key)) { continue; }
        var param = properties[key];
        //console.log('param',param);
        if (!param) { continue; }

        const type = makeType(param);
        const size = makeSize(param);

        const allowedValues = makeAllowedValues(param);

        var description = param.description || '';
        if (param.type === 'array') {
            description += ' '+ (param.items.description || '');
        }

        // make field
        const parent = p ? p + '.':'';
        let field = parent + key;

        if (Object.keys(param).includes('default')) {
            if (typeof param.default === 'object') {
                field += '=\''+JSON.stringify(param.default)+'\'';
            } else {
                field += '='+param.default;
            }
        }

        if (!isRequired(schema, key)) {
            field = '['+field+']';
        }

        if (p) key = p + '.' + key;
        var g = group ? '('+group+') ' : '';
        // make group
        params[key] = g+'{'+type+size+allowedValues+'} '+field+' '+description;
        let subs = {};

        //var subgroup = p ? p+'.' : ''; // TODO apidoc - groups cannot have `.` in them
        if (isType(param.type, 'array') && param.items.type === 'object') {
            subs = traverse(param.items, key, group); // subgroup+
        } else if (isType(param.type, 'object')) {
            subs = traverse(param, key, group); // subgroup+
        }

        for (const subKey in subs) {
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

function build (relativePath, data, element, group) {
    data = JSON.parse(data);

    const elements = [];

    try {
        // run sync - https://github.com/BigstickCarpet/json-schema-ref-parser/issues/14
        const schema = deasync($RefParser.dereference(relativePath, data, {}));

        const lines = traverse(schema, null, group);
        for (const l in lines) {
            if (!lines.hasOwnProperty(l)) continue;

            elements.push({
                source: '@'+element+' '+lines[l]+'\n',
                name: element.toLowerCase(),
                sourceName: element,
                content: lines[l]+'\n'
            });
        }
    } catch (err) {
        throw err;
    }

    return elements;
}

module.exports = build;
