GIFramework Maps
============


[![Development (.NET)](https://github.com/Dorset-Council-UK/GIFramework-Maps/actions/workflows/dev-build.yml/badge.svg)](https://github.com/Dorset-Council-UK/GIFramework-Maps/actions/workflows/dev-build.yml)
[![Production (.NET)](https://github.com/Dorset-Council-UK/GIFramework-Maps/actions/workflows/prod-build.yml/badge.svg)](https://github.com/Dorset-Council-UK/GIFramework-Maps/actions/workflows/prod-build.yml)

GIFramework Maps is a [.NET](https://dot.net) based web mapping application designed and developed by the Dorset Council GIS team.

GIFramework Maps is used by Dorset Council as their primary web mapping application for staff and the public. [You can see it running live here](https://gi.dorsetcouncil.gov.uk/dorsetexplorer).

GIFramework Maps is Open Source software (using [OpenLayers](https://openlayers.org/) and [Bootstrap](https://getbootstrap.com/), as well as many other libraries) and is licensed under the MIT licence.

## Features

GIFramework Maps is a web application for creating, sharing and managing web maps using data from multiple OGC web services. It is designed to be user friendly yet powerful, with a raft of included features.

With GIFramework Maps, you can:
- Display layers from multiple sources, including raster and vector data
- Query spatial data with ease, and customise what users see with nunjucks templating
- Add, edit and export annotations
- Measure lines and areas
- Export maps to PDFs with customisable templates and legends
- Share maps using a simple link
- Track your location using your GPS, and export the track
- Search for locations using mutliple configurable search services
- Manage all your maps using the built-in GUI administation pages
- Provide secure versions using Azure AD login

![Example of a feature query in a GIFramework Maps Map](https://github.com/user-attachments/assets/54b50936-54c7-4565-be82-a51f57ca1910)


## Bugs

Please use the [GitHub issue tracker](https://github.com/Dorset-Council-UK/GIFramework-Maps/issues) for all bugs and feature requests. Before creating a new issue, do a quick search to see if the problem has been reported already.

Dorset Council staff should submit issues via the internal help desk.

## Dependencies
To run GIFramework Maps with minimal modification, you will need:
- A web server capable of running .NET applications, such as IIS, Kestrel or Azure
- PostgreSQL 13+ with PostGIS extension

GIFramework Maps uses [Entity Framework Core](https://docs.microsoft.com/en-us/ef/core/). Postgres has been set up for this project, but with some modifications, any Entity Framework Core compatible provider should work. For a full list of providers, check the [Entity Framework docs](https://docs.microsoft.com/en-us/ef/core/providers/?tabs=dotnet-core-cli).

## Contributing

Please see our guide on [contributing](CONTRIBUTING.md) if you're interested in getting involved.

## Reporting security issues

Security issues should be reported privately, via email, to the Dorset Council GIS team gis@dorsetcouncil.gov.uk. You should receive a response within 24 hours during business days.

## Core developers

GIFramework Maps is a Dorset Council Open Source project.

- [Paul Wittle](https://github.com/paul-dorsetcouncil) - Dorset Council
- [Rob Quincey](https://github.com/RobQuincey-DC) - Dorset Council
- [Lucy Bishop](https://github.com/VulpesFerrilata) - Dorset Council

## Alternatives

GIFramework Maps is a Dorset Council project and has been built according to our particular needs. Whilst we believe the project can be easily used and adapted
by others, and is fairly flexible, there are other alternatives out there that may fit your needs better.

Check out the [OSGeo website](https://www.osgeo.org/choose-a-project/) for other alternatives that may be better suited to your needs.

## Acknowledgements

GIFramework Maps would not be possible without the open source community. This is just a small list of our favourite open source projects and organisations that have helped us:

- [OpenLayers](https://openlayers.org)
- [GeoServer](https://geoserver.org)
- [Bootstrap](https://getbootstrap.com)
- [.NET](https://dot.net)
- [Postgres](https://www.postgresql.org/)/[PostGIS](https://postgis.net/)
- [TypeScript](https://typescriptlang.org)
- [GeoSolutions](https://geosolutionsgroup.com)
- [OSGeo](https://www.osgeo.org) and [OSGeo:UK](https://uk.osgeo.org/)

## Licencing
Unless stated otherwise, the codebase is released under the MIT License. This covers both the codebase and any sample code in the documentation.

The documentation is © Dorset Council and available under the terms of the Open Government 3.0 licence.

