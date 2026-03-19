const path = require('path');
const webpack = require('webpack');

module.exports = (env = {}, argv) => {
  const isDemo = !!env.demo;

  const plugins = isDemo ? [] : [
    // Replace demo-data.js with a no-op stub in production builds.
    // Pass --env demo to include real demo data (e.g. npm run dev).
    new webpack.NormalModuleReplacementPlugin(
      /[\\/]demo-data\.js$/,
      path.resolve(__dirname, 'src/lib/demo-data.stub.js')
    )
  ];

  return {
    devtool: 'source-map',
    entry: {
      background: './src/background.js',
      side_panel: './src/side_panel/side_panel.js',
      options: './src/options/options.js',
      changelog: './src/changelog/changelog.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].bundle.js',
      chunkFilename: '[name].chunk.js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          type: 'javascript/auto',
          use: {
            loader: 'babel-loader',
            options: {
              cacheDirectory: false,
              cacheCompression: false,
              sourceType: 'module'
            }
          }
        }
      ]
    },
    resolve: {
      extensions: ['.js']
    },
    optimization: {
      minimize: argv.mode === 'production'
    },
    plugins
  };
};
