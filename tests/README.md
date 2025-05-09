# SideTimeTable Testing

This directory contains tests for the SideTimeTable Chrome extension.

## Testing Setup

The tests use Jest as the testing framework with the following configuration:

- **Jest**: JavaScript testing framework
- **jest-environment-jsdom**: DOM environment for testing UI components
- **@testing-library/dom** and **@testing-library/jest-dom**: Utilities for testing DOM elements
- **jest-chrome**: Mocks for Chrome API

## Test Structure

- **setup.js**: Jest setup file that configures the testing environment
- **mocks/chrome-mock.js**: Mock implementation of Chrome API
- **background.test.js**: Tests for the background service worker
- **side_panel.test.js**: Tests for the side panel UI component
- **options.test.js**: Tests for the options page

## Running Tests

To run the tests:

```bash
npm test
```

To run tests with coverage:

```bash
npm run test:coverage
```

To run tests in watch mode:

```bash
npm run test:watch
```

## Mocking

The tests use the following mocking strategies:

- **Chrome API**: Mocked using jest-chrome and custom mocks
- **DOM**: Set up using JSDOM and @testing-library
- **Google Calendar API**: Mocked using Jest's mocking capabilities
- **Storage**: Chrome storage API is mocked to simulate saved settings and events

## Test Coverage

The tests cover the following functionality:

- Background script:
  - Google Calendar integration
  - Authentication handling
  - Message passing

- Side panel:
  - Timeline rendering
  - Event display
  - Local event management
  - Current time indicator

- Options page:
  - Settings storage and retrieval
  - UI interactions
  - Google authentication
