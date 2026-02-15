const path = require('path');

module.exports = {
  mode: 'production',
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
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: false,
            cacheCompression: false
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  },
  optimization: {
    minimize: false
  }
};