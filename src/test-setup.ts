import fc from "fast-check";

// Hatim's property-testing decision (ticket 09 Comments): fixed seed, so every property failure
// reproduces. Tests that pass their own seed still override this.
fc.configureGlobal({ seed: 20260927 });
