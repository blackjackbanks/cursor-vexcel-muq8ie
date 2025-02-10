import path from 'path';
import webpack from 'webpack'; // ^5.80.0
import HtmlWebpackPlugin from 'html-webpack-plugin'; // ^5.5.0
import TerserPlugin from 'terser-webpack-plugin'; // ^5.3.7
import CompressionPlugin from 'compression-webpack-plugin'; // ^10.0.0
import type { Configuration as WebpackConfiguration } from 'webpack';
import type { Configuration as WebpackDevServerConfiguration } from 'webpack-dev-server';
import { compilerOptions, paths } from './tsconfig.json';

interface Configuration extends WebpackConfiguration {
  devServer?: WebpackDevServerConfiguration;
}

const getConfig = (env: { production?: boolean; development?: boolean }): Configuration => {
  const isProduction = env.production || false;
  const isDevelopment = env.development || false;

  // Resolve tsconfig path aliases
  const aliasEntries = Object.entries(paths).reduce((acc, [key, value]) => {
    const aliasKey = key.replace('/*', '');
    const aliasPath = path.resolve(__dirname, value[0].replace('/*', ''));
    return { ...acc, [aliasKey]: aliasPath };
  }, {});

  const config: Configuration = {
    mode: isProduction ? 'production' : 'development',
    target: ['web', 'es6'],
    entry: {
      app: [
        // Polyfills for browser compatibility
        './src/polyfills.ts',
        // Main application entry
        './src/index.tsx'
      ]
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? '[name].[contenthash].js' : '[name].js',
      chunkFilename: isProduction ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
      publicPath: '/',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: isDevelopment,
                projectReferences: true,
                configFile: path.resolve(__dirname, './tsconfig.json')
              }
            }
          ],
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                modules: {
                  localIdentName: isProduction ? '[hash:base64]' : '[path][name]__[local]'
                },
                importLoaders: 1
              }
            }
          ]
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      alias: aliasEntries
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development'),
        'process.env.PUBLIC_URL': JSON.stringify('/')
      }),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'public/index.html'),
        favicon: path.resolve(__dirname, 'public/assets/icons/favicon.ico'),
        inject: true,
        scriptLoading: 'defer',
        minify: isProduction ? {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        } : false
      }),
      ...(isProduction ? [
        new CompressionPlugin({
          algorithm: 'gzip',
          test: /\.(js|css|html|svg)$/,
          threshold: 10240,
          minRatio: 0.8
        })
      ] : [])
    ],
    devServer: {
      port: 3000,
      hot: true,
      https: {
        key: path.resolve(__dirname, 'certs/server.key'),
        cert: path.resolve(__dirname, 'certs/server.crt')
      },
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      static: {
        directory: path.resolve(__dirname, 'public'),
        publicPath: '/'
      },
      historyApiFallback: true,
      compress: true,
      client: {
        overlay: {
          errors: true,
          warnings: false
        }
      }
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: -10
          },
          common: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true
          }
        }
      },
      runtimeChunk: 'single',
      minimize: isProduction,
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            compress: {
              drop_console: isProduction,
              drop_debugger: isProduction
            },
            format: {
              comments: false
            }
          },
          extractComments: false
        })
      ]
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    stats: {
      colors: true,
      modules: false,
      children: false,
      chunks: false,
      chunkModules: false
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxAssetSize: 512000,
      maxEntrypointSize: 512000
    }
  };

  return config;
};

export default getConfig;