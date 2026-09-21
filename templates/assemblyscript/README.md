# AssemblyScript sketch starter

Edit `assembly/index.ts` and build from the SDK root with
`./phyllo build assemblyscript`. AssemblyScript looks like TypeScript but is a
separate, statically typed language: browser JavaScript packages and APIs are
not available inside the sketch.

This starter disables the managed runtime and avoids arrays, strings, and
allocation in the frame loop to keep modules small and deterministic.

