# creating-source-plugin-tutorial (WIP)

Companion project for the "Creating a Source Plugin" Gatsby tutorial.

## Prerequisites

You'll need to have these tools installed:

- Node.js (v18 or newer)
- Git
- Yarn

You can also follow [Part 0: Set Up Your Development Environment](https://www.gatsbyjs.com/docs/tutorial/part-0/) for more detailed instructions.

## Usage

1. Clone this project
1. `yarn` to install dependencies
1. `yarn test` to run unit tests
1. `yarn lint:fix` to run linting

### Development

1. `yarn develop:deps` to build & serve the API at http://localhost:4000, and to also watch the source plugin for changes
1. `yarn develop:site` in another terminal window to run `gatsby develop` for the test site

If you make changes to the source plugin you will need to restart the `site` server to see the changes reflected in the site.

### Build

1. `yarn start:api` to build and serve the API at http://localhost:4000
1. `yarn build` in another terminal window to build the production plugin and site
1. `yarn serve:site` to serve the Gatsby site at http://localhost:9000. You should see an overview of all posts

## Project structure

This project includes three directories:

- `api` is the example mock backend API you will source from
- `plugin` is the example source plugin
- `site` is the example site

The source plugin consumes the API, and the site uses the source plugin.
