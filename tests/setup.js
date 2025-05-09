import '@testing-library/jest-dom';

global.chrome = require('jest-chrome');

document.body.innerHTML = '<div id="root"></div>';

global.fetch = jest.fn();

global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};
