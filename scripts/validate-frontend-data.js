const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const schemaPath = path.join(root, 'schemas', 'frontend-data.v1.schema.json');
const dataDir = path.resolve(root, process.argv[2] || 'json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const errors = [];

function describeType(value) {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'null';
    if (Number.isInteger(value)) return 'integer';
    if (typeof value === 'number') return 'number';
    return typeof value;
}

function resolveReference(reference) {
    if (!reference.startsWith('#/')) {
        throw new Error(`Unsupported schema reference: ${reference}`);
    }
    return reference.slice(2).split('/').reduce((current, key) => current[key], schema);
}

function matchesType(value, expectedType) {
    if (expectedType === 'array') return Array.isArray(value);
    if (expectedType === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
    if (expectedType === 'integer') return Number.isInteger(value);
    if (expectedType === 'number') return typeof value === 'number' && Number.isFinite(value);
    if (expectedType === 'null') return value === null;
    return typeof value === expectedType;
}

function validate(value, rule, pointer) {
    if (!rule || Object.keys(rule).length === 0) return;
    if (rule.$ref) {
        validate(value, resolveReference(rule.$ref), pointer);
        return;
    }

    const expectedTypes = Array.isArray(rule.type) ? rule.type : rule.type ? [rule.type] : [];
    if (expectedTypes.length && !expectedTypes.some(type => matchesType(value, type))) {
        errors.push(`${pointer}: expected ${expectedTypes.join(' or ')}, found ${describeType(value)}`);
        return;
    }

    if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${pointer}: unexpected value ${JSON.stringify(value)}`);
    }
    if (typeof value === 'string') {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
            errors.push(`${pointer}: string is shorter than ${rule.minLength}`);
        }
        if (rule.pattern && !(new RegExp(rule.pattern)).test(value)) {
            errors.push(`${pointer}: string does not match ${rule.pattern}`);
        }
    }
    if (typeof value === 'number') {
        if (rule.minimum !== undefined && value < rule.minimum) {
            errors.push(`${pointer}: value is below ${rule.minimum}`);
        }
        if (rule.maximum !== undefined && value > rule.maximum) {
            errors.push(`${pointer}: value is above ${rule.maximum}`);
        }
    }
    if (Array.isArray(value)) {
        if (rule.minItems !== undefined && value.length < rule.minItems) {
            errors.push(`${pointer}: array has fewer than ${rule.minItems} items`);
        }
        if (rule.items) {
            value.forEach((item, index) => validate(item, rule.items, `${pointer}/${index}`));
        }
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        for (const requiredKey of rule.required || []) {
            if (!Object.prototype.hasOwnProperty.call(value, requiredKey)) {
                errors.push(`${pointer}: missing required property ${requiredKey}`);
            }
        }
        for (const [key, childRule] of Object.entries(rule.properties || {})) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                validate(value[key], childRule, `${pointer}/${key}`);
            }
        }
        if (rule.additionalProperties && typeof rule.additionalProperties === 'object') {
            for (const [key, childValue] of Object.entries(value)) {
                if (!Object.prototype.hasOwnProperty.call(rule.properties || {}, key)) {
                    validate(childValue, rule.additionalProperties, `${pointer}/${key}`);
                }
            }
        }
    }
}

const datasets = {};
for (const [property, filename] of Object.entries(schema['x-files'])) {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) {
        errors.push(`/${property}: missing file ${filename}`);
        continue;
    }
    try {
        datasets[property] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        errors.push(`/${property}: invalid JSON (${error.message})`);
    }
}

validate(datasets, schema, '');

for (const analysisName of ['fraccionament', 'concentracio', 'electoralisme', 'dependencia']) {
    const analysis = datasets[analysisName];
    if (analysis && analysis.total_alertes !== analysis.alertes.length) {
        errors.push(`/${analysisName}: total_alertes does not match alertes.length`);
    }
}
for (const [index, company] of (datasets.empreses || []).entries()) {
    if (company.num_contratos !== company.contratos.length) {
        errors.push(`/empreses/${index}: num_contratos does not match contratos.length`);
    }
}

if (errors.length) {
    console.error(`Frontend data validation failed with ${errors.length} error(s):`);
    errors.slice(0, 50).forEach(error => console.error(`- ${error}`));
    if (errors.length > 50) console.error(`- ... ${errors.length - 50} more`);
    process.exitCode = 1;
} else {
    console.log(`Validated ${Object.keys(schema['x-files']).length} frontend datasets against schema v1`);
}
