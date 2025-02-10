// @babel/core ^7.22.0
// @babel/preset-env ^7.22.0
// @babel/preset-react ^7.22.0
// @babel/preset-typescript ^7.22.0
// @babel/plugin-transform-runtime ^7.22.0

module.exports = (api) => {
  // Cache configuration based on NODE_ENV for better performance
  api.cache.using(() => process.env.NODE_ENV);

  return {
    presets: [
      [
        "@babel/preset-env",
        {
          // Target browsers based on technical specifications
          targets: {
            edge: "88",
            chrome: "88",
            safari: "14"
          },
          // Use modern features with fallbacks
          useBuiltIns: "usage",
          // Specify core-js version for polyfills
          corejs: 3,
          // Optimize modules for development/production
          modules: process.env.NODE_ENV === "test" ? "commonjs" : false,
          // Debug mode for development troubleshooting
          debug: process.env.NODE_ENV === "development"
        }
      ],
      [
        "@babel/preset-typescript",
        {
          // Enable JSX parsing in TypeScript files
          isTSX: true,
          // Apply JSX parsing to all extensions
          allExtensions: true,
          // Optimize TypeScript output
          optimizeConstEnums: true
        }
      ],
      [
        "@babel/preset-react",
        {
          // Use new JSX transform for React 18
          runtime: "automatic",
          // Enable development mode features when appropriate
          development: process.env.NODE_ENV === "development",
          // Import source for improved debugging
          importSource: "@welldone-software/why-did-you-render"
        }
      ]
    ],
    plugins: [
      [
        "@babel/plugin-transform-runtime",
        {
          // Enable polyfilling of core-js features
          corejs: 3,
          // Use helpers for better code reuse
          helpers: true,
          // Enable regenerator for async/await
          regenerator: true,
          // Use ESM modules when possible
          useESModules: process.env.NODE_ENV !== "test",
          // Absolute runtime path for consistent builds
          absoluteRuntime: false
        }
      ]
    ],
    // Ignore node_modules except for specific packages that need transpilation
    ignore: [
      /node_modules\/(?!(@fluentui|office-ui-fabric-react|@uifabric|@microsoft)\/).*/
    ],
    // Enable source maps for development
    sourceMaps: process.env.NODE_ENV === "development",
    // Compact output for production
    compact: process.env.NODE_ENV === "production",
    // Comments handling
    comments: process.env.NODE_ENV === "development",
    // Minification settings
    minified: process.env.NODE_ENV === "production"
  };
};