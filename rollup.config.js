"use strict"

import clear from "rollup-plugin-clear"
import resolve from "rollup-plugin-node-resolve"
import commonjs from "rollup-plugin-commonjs"
import typescript from "rollup-plugin-typescript2"
import screeps from "rollup-plugin-screeps"
import replace from "rollup-plugin-replace"

let cfg
const dest = process.env.DEST
if (!dest) {
  console.log("No destination specified - code will be compiled but not uploaded")
} else if ((cfg = require("./screeps.json")[dest]) == null) {
  throw new Error("Invalid upload destination")
}

export default {
  input: "src/main.ts",
  output: {
    file: "dist/main.js",
    format: "cjs",
    sourcemap: true,
    intro: "const __PROFILER_ENABLED__ = true;"
  },

  plugins: [
    replace({
      // returns 'true' if code is bundled in prod mode
      // PRODUCTION: JSON.stringify(isProduction),
      // you can also use this to include deploy-related data, such as
      // date + time of build, as well as latest commit ID from git
      __BUILD_TIME__: JSON.stringify(Date.now()),
      __REVISION__: JSON.stringify(require("git-rev-sync").short())
    }),
    clear({ targets: ["dist"] }),
    resolve(),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.json" }),
    screeps({ config: cfg, dryRun: cfg == null })
  ]
}
