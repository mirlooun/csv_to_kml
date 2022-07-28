const fs = require('fs');
let tj = require('@mapbox/togeojson');
let DOMParser = require('xmldom').DOMParser;
const path = require('path');

let kml = new DOMParser().parseFromString(fs.readFileSync(path.resolve() + '/output/City of Edmonton - Neighbourhoods.kml', 'utf8'));
let converted = tj.kml(kml);

console.log(converted.features);
