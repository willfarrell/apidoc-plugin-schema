const apidoc = require('apidoc-core');
const test = require('tape');
const path = require('path');

test('schema test', (t) => {
    apidoc.setGeneratorInfos({});
    apidoc.setLogger({
        error: (err) => { t.error(err); },
        warn: () => {},
        debug: () => {},
        verbose: () => {},
        info: () => {}
    });
    apidoc.setPackageInfos({
        'name': 'test',
        'version': '0.0.0'
    });

    api = apidoc.parse({
        src: path.resolve(__dirname, './test/')
    });

    t.ok(api, 'api-doc parsed file');
    t.ok(api.data, 'api-doc as data');

    const data = JSON.parse(api.data);
    for (const key of ['filename', 'group', 'groupTitle']) {
        t.ok(data[0][key], `has .data[0].${key}`);
        delete data[0][key]
    }

    t.deepEquals(data, [{
        type: 'get',
        url: '/do/something',
        title: '',
        success: {
            fields: {
                'Success 200': [{
                    group: 'Success 200',
                    type: 'String',
                    optional: false,
                    field: 'version',
                    description: 'The version of the API'
                }]
            }
        },
        version: '0.0.0',
        name: 'GetDoSomething'
    }], 'expected body');

    t.end();
});
