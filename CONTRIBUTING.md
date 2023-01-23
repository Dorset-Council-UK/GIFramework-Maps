# Contributing to GIFrameworkMaps

Thanks for your interest in contributing to GIFrameworkMaps.  Please see the project's [Code of Conduct](https://github.com/Dorset-Council-UK/GIFramework-Maps/blob/main/CODE_OF_CONDUCT.md) before proceeding.

## Submitting Bug Reports

Please use the [GitHub issue tracker](https://github.com/Dorset-Council-UK/GIFramework-Maps/issues). Before creating a new issue, do a quick search to see if the problem has been reported already.

## Contributing Code

See [`DEVELOPING.md`](https://github.com/Dorset-Council-UK/GIFramework-Maps/blob/main/DEVELOPING.md) to learn how to get started developing.

Our preferred means of receiving contributions is through [pull requests](https://help.github.com/articles/using-pull-requests). Make sure
that your pull request follows our pull request guidelines below before submitting it.

Before starting work on a feature or issue, make sure you let us know by adding a comment to the relevant issue in the issue tracker.

If you are looking to build new functionality or change something quite signficantly, please check with the core developers before starting work to make sure 
it is something we are happy for you to do.

This page describes what you need to know to contribute code to GIFrameworkMaps as a developer.


## Contributor License Agreement

Your contribution will be under our [license](https://github.com/Dorset-Council-UK/GIFramework-Maps/blob/main/LICENCE) as per [GitHub's terms of service](https://help.github.com/articles/github-terms-of-service/#6-contributions-under-repository-license).


## Pull request guidelines

Before working on a pull request, create an issue explaining what you want to contribute. This ensures that your pull request won't go unnoticed, and that you are not contributing something that is not suitable for the project. Once a core developer has set the `accepted` label on the issue, you can submit a pull request. The pull request description should reference the original issue.

Your pull request must:

 * Pass the tests run automatically by the Continuous Integration system.

 * Address a single issue or add a single item of functionality.

 * Contain a clean history of small, incremental, logically separate commits.

 * Use clear commit messages.

 * Be possible to merge automatically.

Pull requests should merge into the `develop` branch. The core developers will then create Pull requests from `develop` into `main` when ready.

### Address a single issue or add a single item of functionality

Please submit separate pull requests for separate issues.  This allows each to
be reviewed on its own merits.


### Contain a clean history commits

The commit history explains to the reviewer the series of modifications to the
code that you have made and breaks the overall contribution into a series of
easily-understandable chunks. Try not to submit commits that change thousands
of lines or that contain more than one distinct logical change.

### Use clear commit messages

Commit messages should be short, begin with a verb in the imperative, and
contain no trailing punctuation.

Please keep the header line short where possible.

### Be possible to merge automatically

Occasionally other changes to `main` or `develop` might mean that your pull request cannot
be merged automatically.  In this case you may need to rebase your branch on a
more recent `main` or `develop`, resolve any conflicts, and `git push --force` to update
your branch so that it can be merged automatically.
