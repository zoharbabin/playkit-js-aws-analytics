const webpack = require('webpack');
const path = require('path');
const packageData = require('./package.json');

module.exports = (env, { mode }) => {
  return {
    target: 'web',
    entry: './src/index.ts',
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.(tsx?|js)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    bugfixes: true
                  }
                ],
                ['@babel/preset-typescript', { jsxPragma: 'h', jsxPragmaFrag: 'Fragment' }]
              ],
              plugins: [['@babel/plugin-transform-runtime'], ['@babel/plugin-proposal-decorators', { legacy: true }]]
            }
          }
        }
      ]
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js']
    },
    output: {
      filename: 'playkit-aws-analytics.js',
      path: path.resolve(__dirname, 'dist'),
      library: {
        umdNamedDefine: true,
        name: ['KalturaPlayer', 'plugins', 'awsAnalytics'],
        type: 'umd'
      },
      clean: true
    },
    externals: {
      '@playkit-js/kaltura-player-js': 'root KalturaPlayer',
      '@playkit-js/playkit-js-ui': 'root KalturaPlayer.ui',
      '@playkit-js/playkit-js': 'root KalturaPlayer.core'
    },
    devServer: {
      static: {
        directory: path.join(__dirname, 'demo')
      },
      client: {
        progress: true
      }
    },
    plugins: [
      new webpack.DefinePlugin({
        __VERSION__: JSON.stringify(packageData.version),
        __NAME__: JSON.stringify(packageData.name)
      })
    ]
  };
};
