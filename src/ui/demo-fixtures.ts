// The labelled demo-fixture source (ticket 01 Ruling R6). Ticket 02 widens it to the full corpus.
const sources = import.meta.glob<string>("/fixtures/functions/bootcamp/sumRange.js", {
  query: "?raw",
  import: "default",
  eager: true,
});

export interface DemoFixture {
  functionName: string;
  path: string;
  source: string;
}

export const DEMO_FIXTURES: DemoFixture[] = [
  {
    functionName: "sumRange",
    path: "fixtures/functions/bootcamp/sumRange.js",
    source: sources["/fixtures/functions/bootcamp/sumRange.js"],
  },
];
