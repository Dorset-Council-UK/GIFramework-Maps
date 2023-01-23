GIFrameworkMaps
============

GIFrameworkMaps is a [.NET](https://dot.net) based web mapping application designed and developed by the Dorset Council GIS team.

## Dependencies
To run GIFrameworkMaps with minimal modification, you will need.
- A web server capable of running .NET 5 applications, such as IIS, Kestral or Azure
- PostgresSQL 13+ with PostGIS extension
- Azure Key Vault

GIFrameworkMaps uses [Entity Framework Core](https://docs.microsoft.com/en-us/ef/core/), so any spatial database that has an Entity Framework Core provider should work, but this has not been tested. For a full list of providers, check the [Entity Framework docs](https://docs.microsoft.com/en-us/ef/core/providers/?tabs=dotnet-core-cli).

You could also put your user secrets into Environment Variables rather than Azure Key Vault, but this will require some modification.
## Get Started
- Clone the repository. The master branch should always be the latest, stable version.
- Create a user in your database called 'efcore' with permission to create schemas and login
- Set up your connection strings and user secrets (TODO - Document/Script this)
- Run the Entity Framework migrations
    - Using Visual Studio
        - `Update-Database -Context IdentityContext`
        - `Update-Database -Context ApplicationDbContext`
    - Using .Net CLI
        - `dotnet ef database update --context IdentityContext`
        - `dotnet ef database update --context ApplicationDbContext`
- Run an `npm update` to download the dependencies
    - In Visual Studio this can be done by installing the NPM Task Runner Extension and using Task Runner Explorer
- Build and Run!


## Contributing

Some of the best ways to contribute are to try things out, file issues, join in design conversations,
and make pull-requests.

## Reporting security issues

Security issues should be reported privately, via email, to the Dorset Council GIS team gis@dorsetcouncil.gov.uk. You should receive a response within 24 hours during business days.
