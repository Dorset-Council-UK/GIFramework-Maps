## Dependencies
To run GIFrameworkMaps with minimal modification, you will need.
- A web server capable of running .NET applications, such as IIS, Kestral or Azure (locally IIS Express or Kestral should be fine). Linux servers can use Kestral via an Nginx proxy.
- PostgresSQL 13+ with PostGIS extension

## Get Started
- Clone the repository - the `main` branch should always be the latest, stable version
- Create a user in your database with permission to login
    - You can then either [create the schema yourself](#create-the-schema-yourself) or [let EF create the schema for you](#let-ef-create-the-schema-for-you)
- Set up your [connection strings and user secrets](#user-secrets-and-connection-strings)
- Run an `npm update` to download the dependencies
    - In Visual Studio this can be done by installing the NPM Task Runner Extension and using Task Runner Explorer
    - Alternatively just use the command line
- Run the Entity Framework migrations
    - Using Visual Studio
        - `Update-Database`
    - Using .Net CLI
        - `dotnet ef database update`
- Build and Run!

This will give you a minimal starting application, with a few basic basemaps, to get you started. Start modifying your database
either directly or by using the adminstration functions in the application to start adding layers, basemaps, versions and so on.

## Detailed guidelines
First, clone the repositiry - the `main` branch should always be the latest, stable version.

### Setting up a database
To run the project locally you will need to create a suitable database. Postgres is the only database provider currently set up, but with minimal adjustments you could make it use any Entity Framework compatible provider. Install the PostGIS extension to enable geometries in Postgres. 

In your database, create a user for Entity Framework to use and give it permission to login.

You can either let Entity Framework create your schema for you, or create it yourself. 
#### Create the schema yourself
Create a schema within your database called giframeworkmaps. To avoid complex permissions, make the user account you created the owner of the schema.

#### Let EF create the schema for you
In order for EF to be able to create the schema, your user will need permission on the database to create schemas.

### User secrets and connection strings
Once you’ve set up your database, add a user secret to your local copy of the application. In Visual Studio this is done by right-clicking on the web project and selecting “Manage user secrets”.

In user secrets add the below line of code and fill in your database name, username and password:

`{
"ConnectionStrings:GIFrameworkMaps": "Host=localhost;Database=YourDatabaseName;Username=YourUserName;Password=YourPassword;SearchPath=giframeworkmaps"
}`

You should now be able to test your connection and run migrations using Entity Framework commands.

You can choose to use appSettings or Environment Variables to store your secrets if you prefer. Azure KeyVault is also available with a few configuration settings, and is recommended for production scenarios.

### Download optional extensions in Visual Studio
There are two extensions we use in Visual Studio that you can download: 
- NPM Task Runner
- EF Core Power Tools 

It's entirely optional to download these extensions. You can download these by going to the Extensions menu and then to Manage Extensions. You’ll need to restart Visual Studio once you’ve downloaded them.

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

### Authentication
Follow these instructions if you want your app to have authentication so that permitted users can access the administration part of the site.

Currently this app only supports Microsoft Azure AD B2C authentication. Refer to the official documentation to set this up in your project.

Once you've got a service set up, you'll need to add a number of settings to your user secrets to enable it.

```
"AzureAd": {
  "Instance": "https://<your-instance-name>.b2clogin.com",
  "Domain": "<your-b2c-domain>",
  "ClientId": "<your-client-id>",
  "TenantId": "<your-tenant-id>",
  "ClientSecret": "<your-client-secret>",
  "SignedOutCallbackPath": "<your-signout-callback-path>",
  "SignUpSignInPolicyId": "<your-sign-in-policy-id>"
}
```

Go to your database and add a row to `ApplicationRoles` called `GIFWAdmin`. This is the role that has access to the administrative back-end. 

You'll then need to login to your instance in order to retrieve your User ID. Run the application, log in and go to https://<your-application-root>/Account. The User ID will be shown on this page.

Go back to your database, and add a row to `ApplicationUserRoles` with the `UserId` set to your User ID, and the `ApplicationRoleId` set to the ID of the `GIFWAdmin` role you added. You should now have administrative priviliges to the application (you may need to log out and back in)

### Enabling KeyVault

Azure KeyVault is available for secure storage of secrets in production environments.

To set up KeyVault, [follow the instructions on the Microsoft website](https://learn.microsoft.com/en-us/aspnet/core/security/key-vault-configuration?view=aspnetcore-7.0#secret-storage-in-the-production-environment-with-azure-key-vault).

You will then need the following settings in your Environment Variables or appSettings

```
  "KeyVault:AzureAd:ApplicationId": "<your-azure-app-id>",
  "KeyVault:AzureAd:CertificateThumbprint": "<your-certificate-thumbprint>",
  "KeyVault:AzureAd:DirectoryId": "<your-azure-directory-id>",
  "KeyVault:Name": "<your-keyvault-name>",
```

### Further help
For further information and help on configuring the service contact the core developers or leave a message for us in the Discussions section. We might not be able to get back to you straight away and in some cases we may need to charge for this service if your setup is complex or requires a formal agreement.
