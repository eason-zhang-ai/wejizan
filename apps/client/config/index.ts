import path from 'node:path'
import { defineConfig, type UserConfigExport } from '@tarojs/cli'

export default defineConfig(async () => {
  const sharedSources = [
    path.resolve(__dirname, '../../../packages/contracts/src'),
    path.resolve(__dirname, '../../../packages/editor-core/src'),
  ]
  const config: UserConfigExport = {
    projectName: 'wejizan',
    date: '2026-07-20',
    designWidth: 750,
    deviceRatio: {
      375: 2,
      640: 1.17,
      750: 1,
      828: 0.905,
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    framework: 'react',
    compiler: 'webpack5',
    cache: { enable: true },
    alias: {
      '@wejizan/contracts': path.resolve(__dirname, '../../../packages/contracts/src'),
      '@wejizan/editor-core': path.resolve(__dirname, '../../../packages/editor-core/src'),
    },
    mini: {
      compile: { include: sharedSources },
      webpackChain(chain) {
        chain.module.rule('script').use('babelLoader').tap((options) => ({
          ...options,
          configFile: path.resolve(__dirname, '../babel.config.cjs'),
        }))
      },
      postcss: {
        pxtransform: { enable: true, config: {} },
        url: { enable: true, config: { limit: 1024 } },
        cssModules: { enable: false },
      },
    },
    h5: {
      compile: { include: sharedSources },
      webpackChain(chain) {
        chain.module.rule('script').use('babelLoader').tap((options) => ({
          ...options,
          configFile: path.resolve(__dirname, '../babel.config.cjs'),
        }))
      },
      publicPath: '/',
      staticDirectory: 'static',
      output: { filename: 'js/[name].[hash:8].js', chunkFilename: 'js/[name].[chunkhash:8].js' },
      devServer: { port: Number(process.env.PORT) || 10086 },
      postcss: {
        autoprefixer: { enable: true, config: {} },
        cssModules: { enable: false },
      },
    },
  }
  return config
})
