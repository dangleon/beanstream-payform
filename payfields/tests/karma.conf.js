
module.exports = function(config) {
    var cfg = {
        browsers: ['Chrome'],
        frameworks: ['jasmine'],
        files: [
          '../../build/v0.0.0/payfields/beanstream_payfields.js',
          './unit/*.spec.js'
        ],
        customLaunchers: {
            Chrome_travis_ci: {
                base: 'Chrome',
                flags: ['--no-sandbox']
            }
        }
    };

    if (process.env.TRAVIS) {
        cfg.browsers = ['Chrome_travis_ci'];
    }

    config.set(cfg);
};
