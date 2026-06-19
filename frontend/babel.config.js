/**
 * @function babelConfig
 * @description Babel configuration. babel-preset-expo handles Reanimated/Worklets/Router automatically; never add those plugins manually.
 *
 * @param {object} api The Babel API object.
 * @returns {object} The Babel configuration object.
 */
module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo']
    };
};
