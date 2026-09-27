import type { Beat } from "../engine";

/** The mutated function as the student wrote it, JSDoc included, with the changed line marked (D4b: original hidden). */
export function MutantCode({ beat }: { beat: Beat }) {
  const docLines = beat.function.docstring ? beat.function.docstring.split("\n") : [];
  const lines = [...docLines, ...beat.mutant.source.split("\n")];
  const changedIndex = docLines.length + beat.mutant.diff.line - 1;
  return (
    <pre className="code">
      <code>
        {lines.map((line, index) => (
          <span key={index} className={index === changedIndex ? "code__line code__line--changed" : "code__line"}>
            {line || " "}
          </span>
        ))}
      </code>
    </pre>
  );
}
