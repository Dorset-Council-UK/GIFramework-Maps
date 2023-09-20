## Dependencies
To run GIFrameworkMaps with minimal modification, you will need.
- A web server capable of running .NET 6 applications, such as IIS, Kestral or Azure (locally IIS Express or Kestral should be fine)
- PostgresSQL 13+ with PostGIS extension

## Get Started
- Clone the repository - the `main` branch should always be the latest, stable version
- Create a user in your database with permission to create schemas and login
- Set up your connection strings and user secrets
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
First, clone the repositiry - the `main` branch should always be the latest, stable version.

### Setting up a database
To run the project locally you will need to create a suitable database. We use Postgres but you can choose any database that is compatible with Entity Framework. If you’re using Postgres, install the PostGIS extension to enable geometries. 

In your database, create a user for Entity Framework to use and give it permission to login and create databases.

Create a schema within your database called giframeworkmaps. You may need to manually add the __EFMigrationsHistory table to the schema. To avoid complex permissions, make the user account you created the owner of the schema.

### User secrets and connection strings in your IDE
Once you’ve set up your database, add a user secret to your local copy of the application. In Visual Studio this is done by right-clicking on the web project and selecting “Manage user secrets”.

In user secrets add the below line of code and fill in your database name, username and password:

`{
"ConnectionStrings:GIFrameworkMaps": "Host=localhost;Database=YourDatabaseName;Username=YourUserName;Password=YourPassword;SearchPath=giframeworkmaps"
}`

You should now be able to test your connection and run migrations using Entity Framework commands.

### Download optional extensions in Visual Studio
There are two extensions we use in Visual Studio that you can download: 
- NPM Task Runner
- EF Core Power Tools 

It's entirely optional to download these extensions. You can download these by going to the Extensions menu and then to Manage Extensions. You’ll need to restart Visual Studio once you’ve downloaded them.

### Authentication
Follow these instructions if you want your app to have authentication so that only permitted users can access the administration part of the site.

Currently this app only supports Microsoft Azure AD B2C authentication. Refer to the official documentation to set this up in your project.

We use Azure KeyVault to provide the connection details to our production service. Refer to the official documentation to set this up in your project.

Once you have setup a service, add the details to your user secrets and go into `program.cs` and match the naming of your secrets.

We recommend you follow the same naming conventions for user roles so that your service returns the role of “GIFWAdmin” for any user that should be able to access the administrator area of the website.

### Running the application
Once you’ve followed the steps above, you’re ready to run the application. 

- Run the Entity Framework migrations to create the empty tables in your database
    - Using Visual Studio
        - `Update-Database`
    - Using .Net CLI
        - `dotnet ef database update`
- Run an `npm update` to download the dependencies
    - In Visual Studio this can be done by installing the NPM Task Runner Extension and using Task Runner Explorer
    - Alternatively just use the command line
- Build and Run!

This will give you a minimal starting application, with a few basic basemaps, to get you started. Start modifying your database either directly or by using the adminstration functions in the application to start adding layers, basemaps, versions and so on.

### Further help
For further information and help on configuring the service contact the core developers or leave a message for us in the Discussions section. We might not be able to get back to you straight away and in some cases we may need to charge for this service if your setup is complex or requires a formal agreement.
