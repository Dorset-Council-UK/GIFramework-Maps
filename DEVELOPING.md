## Dependencies
To run GIFrameworkMaps with minimal modification, you will need.
- A web server capable of running .NET 6 applications, such as IIS, Kestral or Azure (locally IIS Express or Kestral should be fine)
- PostgresSQL 13+ with PostGIS extension

## Get Started
- Clone the repository. The `main` branch should always be the latest, stable version. The `develop`
- Create a user in your database with permission to create schemas and login
- Set up your connection strings and user secrets (TODO - Document/Script this)
- Run the Entity Framework migrations
    - Using Visual Studio
        - `Update-Database`
    - Using .Net CLI
        - `dotnet ef database update`
- Run an `npm update` to download the dependencies
    - In Visual Studio this can be done by installing the NPM Task Runner Extension and using Task Runner Explorer
    - Alternatively just use the command line
- Build and Run!

This will give you a minimal starting application, with a few basic basemaps, to get you started. Start modifying your database
either directly or by using the adminstration functions in the application to start adding layers, basemaps, versions and so on.

## Detailed guidelines

TODO
