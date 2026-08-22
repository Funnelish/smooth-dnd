import { babel } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const extensions = ['.js', '.jsx', '.ts', '.tsx'];

const plugins = [
  nodeResolve({
    extensions,
  }),
  commonjs({
    include: /node_modules/,
  }),
  babel({
    babelHelpers: 'bundled',
    extensions,
    include: ['./index.ts', 'src/**/*'],
    exclude: 'node_modules/**',
  }),
];

export default [
  {
    input: 'index.ts',
    output: {
      file: './dist/index.js',
      format: 'umd',
      sourcemap: false,
      name: 'SmoothDnD',
      exports: 'named',
    },
    plugins: [...plugins, terser()],
  },
  {
    input: 'index.ts',
    output: {
      file: './dist/index.esm.js',
      format: 'es',
      sourcemap: false,
      exports: 'named',
    },
    plugins,
  },
];
