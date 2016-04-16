
var parse = require('./lib/schemas/jsonschema');
var schema = require('./sample/schema');
console.log(parse('', schema));
