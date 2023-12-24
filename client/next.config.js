/** @type {import("next").NextConfig} */

module.exports = {
    staticPageGenerationTimeout: 100,
    reactStrictMode: true,
    webpack: (config) => {
        config.externals = [...config.externals, "canvas", "jsdom"];
        return config;
    },
};