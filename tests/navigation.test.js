const test = require('node:test');
const assert = require('node:assert/strict');

const {
    resolveLanguage,
    contentFileForLanguage,
    metadataForLanguage,
} = require('../js/navigation.js');

test('URL language takes precedence over saved preference', () => {
    assert.equal(resolveLanguage('?lang=zh', 'en'), 'zh');
    assert.equal(resolveLanguage('?lang=en', 'zh'), 'en');
});

test('saved language is used when the URL has no valid language', () => {
    assert.equal(resolveLanguage('', 'zh'), 'zh');
    assert.equal(resolveLanguage('?lang=fr', 'en'), 'en');
    assert.equal(resolveLanguage('', null), 'en');
});

test('language maps to the correct content file', () => {
    assert.equal(contentFileForLanguage('en'), 'home');
    assert.equal(contentFileForLanguage('zh'), 'home-zh');
});

test('Chinese metadata is localized', () => {
    const metadata = metadataForLanguage('zh');

    assert.equal(metadata.documentLanguage, 'zh-CN');
    assert.match(metadata.title, /赵秋涵/);
    assert.equal(metadata.siteName, '赵秋涵');
    assert.equal(metadata.navigation.news, '近期更新');
});
