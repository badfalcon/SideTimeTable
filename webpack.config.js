const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background.js',
    'side_panel/side_panel': './src/side_panel/side_panel.js',
    'options/options': './src/options/options.js',
    'lib/localize': './src/lib/localize.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'img/[name][ext]'
        }
      },
      {
        test: /\.html$/,
        use: ['html-loader']
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    }),
    new HtmlWebpackPlugin({
      template: './src/side_panel/side_panel.html',
      filename: 'side_panel/side_panel.html',
      chunks: ['side_panel/side_panel', 'lib/localize']
    }),
    new HtmlWebpackPlugin({
      template: './src/options/options.html',
      filename: 'options/options.html',
      chunks: ['options/options', 'lib/localize']
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json' },
        { from: '_locales', to: '_locales' },
        { from: 'src/img', to: 'img' },
        { from: 'src/lib/bootstrap.min.css', to: 'lib/bootstrap.min.css' },
        { from: 'src/lib/bootstrap.min.js', to: 'lib/bootstrap.min.js' },
        { from: 'src/lib/popper.min.js', to: 'lib/popper.min.js' },
        { from: 'src/side_panel/side_panel.css', to: 'side_panel/side_panel.css' },
        { from: 'src/options/options.css', to: 'options/options.css' },
        { from: 'src/options/google_button.css', to: 'options/google_button.css' }
      ]
    })
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      name: 'vendors'
    }
  }
};