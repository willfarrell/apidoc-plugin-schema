const fs = require('fs');
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

    if (process.env.UPDATE) fs.writeFileSync(path.resolve(__dirname, 'test/fixture.json'), JSON.stringify(data, null, 4));

    t.deepEquals(data, JSON.parse(fs.readFileSync(path.resolve(__dirname, 'test/fixture.json'))), 'expected body')

    t.end();
});
