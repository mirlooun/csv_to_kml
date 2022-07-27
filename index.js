import * as fs from 'fs';
import path from 'path';
import csv from 'csvtojson';
import builder from 'xmlbuilder';

const __dirname = path.resolve();

const files = fs.readdirSync(`${__dirname}/input`);

for (const file of files) {
    const jsonZones = await csv({ delimiter: ';' }).fromFile(`${__dirname}/input/${file}`);

    const outputFileName = `${path.parse(file).name.replaceAll('_', ' ')}`;

    const kmlString = composeKmlDocumentString(jsonZones, outputFileName);
    
    writeToKmlFile(kmlString, outputFileName);
}

function composeKmlDocumentString(jsonZones, outputFileName) {
    const kmlTree = {
        kml: {
            '@xmlns': 'http://www.opengis.net/kml/2.2',
            Document: {
                '@id': 'root_doc'
            },
            Schema: {
                '@name': outputFileName,
                '@id': outputFileName,
                SimpleField: {
                    '@name': 'Zone',
                    '@type': 'string',
                }
            },
            Folder: {
                name: outputFileName,
                Placemark: getPlacemarks(jsonZones, outputFileName)
            }
        }
    };
    const xml = builder.create(kmlTree).end({ pretty: true });

    return xml;
}

function getPlacemarks(jsonZones, outputFileName) {
    const placemarks = [];

    for (const zone of jsonZones) {
        const placemark = {
            Style: {
                LineStyle:{
                    color: 'ff0000ff'
                },
                PolyStyle: {
                    fill: '0'
                }
            },
            ExtendedData: {
                SchemaData: {
                    '@schemaUrl': `#${outputFileName}`,
                    SimpleData: {
                        '@name': 'Zone',
                        '#text': zone['Name']
                    }
                }
            },
            MultiGeometry: {
                Polygon: {
                    outerBoundaryIs: {
                        LinearRing: {
                            coordinates: {
                                '#text': zone['Geometry Multipolygon']
                            }
                        }
                    }
                }
            }
        }
        placemarks.push(placemark);
    }

    return placemarks;
}

function writeToKmlFile(kmlString, outputFileName) {
    fs.writeFile(`${__dirname}/output/${outputFileName}.kml`, kmlString, 'utf8', (err) => {
        if (err) {
            console.log(err);
        }
        console.log("Success");
    });
}
