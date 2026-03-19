module.exports = {
  presets: [
    ['@babel/preset-env', {
      // Let webpack handle ES modules so dynamic import() is preserved for code-splitting
      modules: false,
      targets: {
        chrome: '88'
      }
    }]
  ],
  ignore: ['node_modules']
};