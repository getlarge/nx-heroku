# nx-heroku

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build nx-heroku` to build the library.

## Running unit tests

Run `nx test nx-heroku` to execute the unit tests via [Jest](https://jestjs.io).

## Deploying to Heroku

To deploy your application to Heroku, you need to have the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed.

When running the executor for the first time, you will be prompted to login to Heroku. You can also login manually by running `heroku login`.
In Github Actions, it comes already installed.

## Usage

### Deploy

#### Generate target

To generate a target for your application, run the following command:

```bash
npx nx g @aloes/nx-heroku:deploy --projectName=my-app
```

This will generate a `deploy` target in your `project.json` file.
