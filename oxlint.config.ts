import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react, next],
  ignorePatterns: [...(core.ignorePatterns ?? []), "packages/ui"],
  overrides: [
    {
      // eve disables a built-in tool by a file named after the tool's exact
      // slug — `read_file.ts`, `write_file.ts` — and fails the build on any
      // other name. The kebab-case rule loses to that contract in this one
      // directory.
      files: ["agents/*/agent/**/tools/*_*.ts"],
      rules: {
        "unicorn/filename-case": "off",
      },
    },
  ],
});
