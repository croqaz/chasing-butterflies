const path = require('path');

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, './src/index.ts'),
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: [/node_modules/, /dist/]
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'game.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
