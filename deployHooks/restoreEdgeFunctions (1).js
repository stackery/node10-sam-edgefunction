const yaml = require('js-yaml');
const fs = require('fs');
const path = require('./node_modules/path');
const crypto = require('crypto');
const execFileSync = require('child_process').execFileSync;

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

const edgeFunctionsPath = path.join('..', '.stackery', 'edgeFunctions.json');
if (fs.existsSync(edgeFunctionsPath)) {
  console.log(`DEBUG: Found edgeFunctions file`);
  const edgeFunctions = JSON.parse(fs.readFileSync(edgeFunctionsPath));

  const templatePath = path.join('..', '.aws-sam', 'build', 'packaged-template.yaml');
  const template = yaml.load(fs.readFileSync(templatePath, 'utf8'), { schema: CF_SCHEMA });

  edgeFunctions.forEach(resourceId => {
    const resource = template.Resources[resourceId];
    resource.Type = 'Custom::StackeryEdgeFunction';
    // resource.Properties.ServiceToken = '!Sub arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:stackery-agent-commander';
    resource.Properties.ServiceToken = { 'Fn::Sub': 'arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:stackery-agent-commander' }
  });

  const templateString = yaml.dump(template, { schema: CF_SCHEMA, noRefs: true, flowLevel: -1, lineWidth: -1 }).trim();
  fs.writeFileSync(templatePath, templateString);

  const info = JSON.parse(process.argv[2]);
  console.log(`DEBUG: args = ${process.argv[2]}`);
  console.log(`DEBUG: S3 bucket = ${info.s3BucketName}`);

  const hash = crypto.createHash('md5');
  hash.setEncoding('hex');
  hash.write(templateString);
  hash.end();

  const md5Hash = hash.read();
  console.log(`DEBUG: template hash = ${md5Hash}`);

  console.log('Uploading updated template file...');
  const s3Uri = `s3://${info.s3BucketName}/deployments/${info.environmentName}/${info.stackName}/${info.startTime}/${md5Hash}.template`
  let cmdArgs = ['s3', 'cp', templatePath, s3Uri];
  if (info.awsProfile) {
    cmdArgs = cmdArgs.concat(['--profile', info.awsProfile]);
  }

  console.log(`Running 'aws ${cmdArgs.join(' ')}'`);
  execFileSync('aws', cmdArgs);
}
