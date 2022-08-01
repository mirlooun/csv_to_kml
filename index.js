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

function getPolygons(zoneCoordinatesString) {
    const polygonCoords = getPolygonCoords(zoneCoordinatesString);

    const xmlPolygons = [];
    
    for (const coordinates of polygonCoords) {
        const Polygon = {
            outerBoundaryIs: {
                LinearRing: {
                    coordinates: {
                        '#text': coordinates
                    }
                }
            }
        }
        xmlPolygons.push(Polygon);
    }

    return xmlPolygons;
}

function getPolygonCoords(zoneCoordinatesString) {
    // If coordinates string is more than 68000 chars split(')) ((') is not working
    // I managed to write my own implementation of split function, which does the same,
    // but doesn't bottleneck on long strings

    let substringStart = 0;

    const polygons = [];

    for (let index = 0; index < zoneCoordinatesString.length; index++) {
        if (zoneCoordinatesString[index] === ')') {
            polygons.push(copy.substring(substringStart, index));
            index += 5;
            substringStart = index;
            zoneCoordinatesString = zoneCoordinatesString.substring(substringStart);
        } else if (index === zoneCoordinatesString.length - 1) {
            polygons.push(zoneCoordinatesString);
        }
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
