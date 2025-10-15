module.exports = {
  presets: [
    ['@babel/preset-env', {
      modules: 'commonjs',
      targets: {
        chrome: '88'
      }
    }]
  ],
  ignore: ['node_modules']
};