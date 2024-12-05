import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { babel } from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';

const extensions = ['.js', '.ts'];
const format = process.env.FORMAT;
const isBrowser = format === 'browser';
const input = isBrowser ? 'src/browser.ts' : 'src/index.ts';

const output = isBrowser
  ? {
      file: 'dist/browser.js',
      format: 'iife',
      name: 'IntelliProveWidgets',
      sourcemap: true,
	  exports: 'default'
    }
  : {
      file: format === 'esm' ? 'dist/esm.js' : 'dist/cjs.js',
      format: format,
      sourcemap: true,
      exports: 'named'
    };

export default {
  input: input,
  output: output,
  plugins: [
    resolve({ extensions }),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json', noEmitOnError: true }),
    babel({ extensions, babelHelpers: 'bundled', include: ['src/**/*'] }),
    terser()
  ]
};
