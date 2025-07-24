const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'production',
  // Use source-map instead of eval-source-map to avoid CSP issues
  devtool: 'source-map',
  entry: {
    background: './src/background.ts',
    'side_panel/side_panel': './src/side_panel/side_panel.ts',
    'options/options': './src/options/options.ts',
    'lib/localize': './src/lib/localize.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
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
        use: [{
          loader: 'html-loader',
          options: {
            minimize: false,
            // Don't process any attributes to avoid conflicts with HtmlWebpackPlugin
            sources: false
          },
        }]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
      chunkFilename: '[id].[contenthash].css',
      ignoreOrder: true // Avoid CSS order warnings
    }),
    new HtmlWebpackPlugin({
      template: './src/side_panel/side_panel.html',
      filename: 'side_panel/side_panel.html',
      chunks: ['side_panel/side_panel', 'lib/localize'],
      minify: {
        collapseWhitespace: false,
        removeComments: false,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        // Remove integrity and crossorigin attributes
        removeAttributeQuotes: false,
        removeAttributes: ['integrity', 'crossorigin']
      }
    }),
    new HtmlWebpackPlugin({
      template: './src/options/options.html',
      filename: 'options/options.html',
      chunks: ['options/options', 'lib/localize'],
      minify: {
        collapseWhitespace: false,
        removeComments: false,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        // Remove integrity and crossorigin attributes
        removeAttributeQuotes: false,
        removeAttributes: ['integrity', 'crossorigin']
      }
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json' },
        { from: '_locales', to: '_locales' },
        { from: 'src/img', to: 'img' },
        { from: 'src/lib/bootstrap.min.css', to: 'lib/bootstrap.min.css' },
        { from: 'src/lib/bootstrap.min.js', to: 'lib/bootstrap.min.js' },
        { from: 'src/lib/popper.min.js', to: 'lib/popper.min.js' }
        // Removed CSS files that are imported in TypeScript files:
        // - src/side_panel/side_panel.css
        // - src/options/options.css
        // - src/options/google_button.css
      ]
    })
  ],
  optimization: {
    splitChunks: {
      chunks: (chunk) => {
        // Don't split the background service worker
        return chunk.name !== 'background';
      },
      name: 'vendors'
    }
  }
};