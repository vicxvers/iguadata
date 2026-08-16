const fs = require('fs');
const path = require('path');

const REQUIRED_VALUES = [
    ['brand', 'name'],
    ['brand', 'tagline'],
    ['municipality', 'name'],
    ['municipality', 'authorityName'],
    ['site', 'url'],
    ['site', 'language'],
    ['site', 'contactEmail'],
    ['site', 'repositoryUrl'],
];

function loadProjectConfig(root) {
    const configPath = path.join(root, 'config', 'project.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    for (const keys of REQUIRED_VALUES) {
        const value = keys.reduce((current, key) => current && current[key], config);
        if (typeof value !== 'string' || !value.trim()) {
            throw new Error(`Missing project configuration: ${keys.join('.')}`);
        }
    }

    config.site.url = config.site.url.replace(/\/+$/, '');
    return config;
}

module.exports = { loadProjectConfig };
