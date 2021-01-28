const filename = __filename;

const element = {
    source:'@apiSchema',
    content:'{jsonschema=./sample/jsonschema.json} apiParam'
};

const plugin = require('./');
console.log(plugin(element, filename));
