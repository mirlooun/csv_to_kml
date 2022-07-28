import * as fs from 'fs';
import path from 'path';
import csv from 'csvtojson';
import builder from 'xmlbuilder';

const __dirname = path.resolve();

const files = fs.readdirSync(`${__dirname}/input`);

for (const file of files) {
    try {
        const jsonZones = await csv({ delimiter: 'auto' }).fromFile(`${__dirname}/input/${file}`);

        const outputFileName = `${path.parse(file).name.replaceAll('_', ' ')}`;

        const kmlString = composeKmlDocumentString(jsonZones, outputFileName);

        writeToKmlFile(kmlString, outputFileName);
    } catch (err) {
        console.log(err);
        console.log('unsupported file');
        continue;
    }
}

function composeKmlDocumentString(jsonData, outputFileName) {
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
                Placemark: getPlacemarks(jsonData, outputFileName)
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
                LineStyle: {
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
                        '#text': zone.Name
                    }
                }
            },
            MultiGeometry: {
                Polygon: getPolygons(zone['Geometry Multipolygon'])
            }
        }
        placemarks.push(placemark);
    }

    return placemarks;
}

function getPolygons(zoneCoordinates) {
    const polygons = [];

    // If coordinates string is more than 68000 chars split(')) ((') is not working
    const zonePolygonsCoordinates = zoneCoordinates.split(' ');
    
    let coordsToCheck = [];
    let tempCoords = [];
    for (let coord of zonePolygonsCoordinates) {
        if (coord.includes('))')) {
            tempCoords.push(coord.replaceAll('))', ''));
            coordsToCheck.push(tempCoords.join(' '));
            tempCoords = [];
            continue;
        } else if (coord.includes('((')) {
            coord = coord.replaceAll('((', '');
        }
        tempCoords.push(coord);
    }

    if (tempCoords.length !== 0) {
        coordsToCheck.push(tempCoords.join(' '));
    }

    for (const coordinates of coordsToCheck) {
        const Polygon = {
            outerBoundaryIs: {
                LinearRing: {
                    coordinates: {
                        '#text': coordinates
                    }
                }
            }
        }
        polygons.push(Polygon);
    }

    return polygons;
}

function writeToKmlFile(kmlString, outputFileName) {
    fs.writeFile(`${__dirname}/output/${outputFileName}.kml`, kmlString, 'utf8', (err) => {
        if (err) {
            console.log(err);
        }
        console.log("Success");
    });
}
