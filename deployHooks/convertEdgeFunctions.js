const yaml = require('js-yaml');
const fs = require('fs');
const path = require('./node_modules/path');

const GETATT_RESOURCE_STRIP_RE = /^[^.]+\./;

const CF_SCHEMA = yaml.Schema.create(yaml.CORE_SCHEMA, [
  new yaml.Type('!Ref', { kind: 'scalar', construct: function (data) { return { Ref: data }; } }),
  new yaml.Type('!Equals', { kind: 'sequence', construct: function (data) { return { 'Fn::Equals': data }; } }),
  new yaml.Type('!Not', { kind: 'sequence', construct: function (data) { return { 'Fn::Not': data }; } }),
  new yaml.Type('!Sub', { kind: 'scalar', construct: function (data) { return { 'Fn::Sub': data }; } }),
  new yaml.Type('!Sub', { kind: 'sequence', construct: function (data) { return { 'Fn::Sub': data }; } }),
  new yaml.Type('!If', { kind: 'sequence', construct: function (data) { return { 'Fn::If': data }; } }),
  new yaml.Type('!And', { kind: 'sequence', construct: function (data) { return { 'Fn::And': data }; } }),
  new yaml.Type('!Or', { kind: 'sequence', construct: function (data) { return { 'Fn::Or': data }; } }),
  new yaml.Type('!Join', { kind: 'sequence', construct: function (data) { return { 'Fn::Join': data }; } }),
  new yaml.Type('!Select', { kind: 'sequence', construct: function (data) { return { 'Fn::Select': data }; } }),
  new yaml.Type('!FindInMap', { kind: 'sequence', construct: function (data) { return { 'Fn::FindInMap': data }; } }),
  new yaml.Type('!GetAtt', { kind: 'scalar', construct: function (data) { return { 'Fn::GetAtt': [data.split('.', 1).pop(), data.replace(GETATT_RESOURCE_STRIP_RE, '')] }; } }),
  new yaml.Type('!GetAtt', { kind: 'sequence', construct: function (data) { return { 'Fn::GetAtt': data }; } }),
  new yaml.Type('!GetAZs', { kind: 'scalar', construct: function (data) { return { 'Fn::GetAZs': data || '' }; } }),
  new yaml.Type('!Base64', { kind: 'scalar', construct: function (data) { return { 'Fn::Base64': data }; } }),
  new yaml.Type('!Base64', { kind: 'mapping', construct: function (data) { return { 'Fn::Base64': data }; } }),
  new yaml.Type('!Cidr', { kind: 'sequence', construct: function (data) { return { 'Fn::Cidr': data }; } }),
  new yaml.Type('!ImportValue', { kind: 'scalar', construct: function (data) { return { 'Fn::ImportValue': data }; } }),
  new yaml.Type('!ImportValue', { kind: 'mapping', construct: function (data) { return { 'Fn::ImportValue': data }; } }),
  new yaml.Type('!Split', { kind: 'sequence', construct: function (data) { return { 'Fn::Split': data }; } }),
  new yaml.Type('!Condition', { kind: 'scalar', construct: function (data) { return { 'Condition': data }; } })
]);

const templatePath = path.join('..', '.stackery', 'template.yaml');
const template = yaml.load(fs.readFileSync(templatePath, 'utf8'), { schema: CF_SCHEMA });
console.dir(template);

let edgeFunctions = [];

if (template.Resources) {
  for (const resourceId in template.Resources) {
    const resource = template.Resources[resourceId];
    console.log(`DEBUG: Checking resource ${resourceId}, type = ${resource.Type}`);

    if (resource.Type === 'Custom::StackeryEdgeFunction') {
      console.log(`Found an edge function: ${resourceId}`);
      edgeFunctions.push(resourceId);

      resource.Type = 'AWS::Serverless::Function';
      delete resource.Properties.ServiceToken;
    }
  }
}

const edgeFunctionsPath = path.join('..', '.stackery', 'edgeFunctions.json');
fs.writeFileSync(edgeFunctionsPath, JSON.stringify(edgeFunctions));
fs.writeFileSync(templatePath, yaml.dump(template, { schema: CF_SCHEMA, noRefs: true, flowLevel: -1, lineWidth: -1 }).trim());
