# Fixture functions

The corpus `/filter-lab` runs, and the tracer bullet's first input.

- `bootcamp/`: twelve functions written the way bootcamp code tends to look, some carrying the latent quirks real student code has. They are deliberately unannotated: a comment naming the misconception a fixture "tests" would turn the lab into grading the model against a guess.
- `own/`: Hatim's own functions, copied in unedited.
- `out-of-scope/`: code the scope check must reject with a visible reason (DOM, network, React).

Two fixtures stress spec seams worth deciding before `04` is built:

- `average.js` is an arrow function assigned to a `const`; `01` §5 says "function declarations".
- `makeCounter.js` returns a function; `05` asks the student to predict an output, and a closure has no printable value.
