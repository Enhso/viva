import { describe, expect, it } from "vitest";
import { filterJsFiles } from "./tree-filter";

describe("filterJsFiles", () => {
  it("includes plain top-level and nested .js files", () => {
    const { included, skipped } = filterJsFiles([
      { path: "index.js", type: "blob" },
      { path: "src/helpers.js", type: "blob" },
    ]);

    expect(included.map((entry) => entry.path)).toEqual(["index.js", "src/helpers.js"]);
    expect(skipped).toHaveLength(0);
  });

  it("skips files under a dependency or build-output directory", () => {
    const { included, skipped } = filterJsFiles([
      { path: "node_modules/left-pad/index.js", type: "blob" },
      { path: "dist/bundle.js", type: "blob" },
      { path: "src/deep/build/artifact.js", type: "blob" },
    ]);

    expect(included).toHaveLength(0);
    expect(skipped.every((s) => s.reason === "dependency or build-output directory")).toBe(true);
  });

  it("skips minified files", () => {
    const { included, skipped } = filterJsFiles([{ path: "src/vendor-free.min.js", type: "blob" }]);

    expect(included).toHaveLength(0);
    expect(skipped[0]).toMatchObject({ reason: "minified file" });
  });

  it("skips non-.js files", () => {
    const { included, skipped } = filterJsFiles([
      { path: "README.md", type: "blob" },
      { path: "src/App.tsx", type: "blob" },
    ]);

    expect(included).toHaveLength(0);
    expect(skipped.every((s) => s.reason === "not a .js file")).toBe(true);
  });

  it("ignores tree entries (directories) themselves", () => {
    const { included, skipped } = filterJsFiles([{ path: "src", type: "tree" }]);

    expect(included).toHaveLength(0);
    expect(skipped).toHaveLength(0);
  });
});
