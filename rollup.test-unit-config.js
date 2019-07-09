"use strict"

import clear from "rollup-plugin-clear"
import resolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import typescript from "rollup-plugin-typescript2"
import buble from "rollup-plugin-buble"
import multiEntry from "rollup-plugin-multi-entry"
import replace from "rollup-plugin-replace"
import builtins from "rollup-plugin-node-builtins"

export default {
  input: "test/unit/**/*.test.ts",
  output: {
    file: "dist/test-unit.bundle.js",
    name: "lib",
    sourcemap: true,
    format: "iife",
    globals: {
      chai: "chai",
      it: "it",
      describe: "describe"
    },
    intro: `const __PROFILER_ENABLED__ = "false";`
  },
  external: ["chai", "it", "describe"],
  plugins: [
    replace({
      // returns 'true' if code is bundled in prod mode
      // PRODUCTION: JSON.stringify(isProduction),
      // you can also use this to include deploy-related data, such as
      // date + time of build, as well as latest commit ID from git
      __BUILD_TIME__: JSON.stringify(Date.now()),
      __REVISION__: JSON.stringify(require("git-rev-sync").short())
    }),
    clear({ targets: ["dist/test.bundle.js"] }),
    resolve(),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.test-unit.json" }),
    multiEntry(),
    // buble()
    builtins()
  ]
}
