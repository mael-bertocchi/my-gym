/**
 * @constant metroConfig
 * @description Default Expo Metro config (Skia/SVG need no extra transformer on SDK 54).
 */
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
