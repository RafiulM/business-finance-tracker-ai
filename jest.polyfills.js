// Polyfill for TextEncoder and TextDecoder for Node.js environment
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock fetch if needed
global.fetch = require('jest-fetch-mock');