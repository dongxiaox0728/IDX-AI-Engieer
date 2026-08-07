import { cosineSimilarity } from "../src/cosineSimilarity";

console.log(
  "Same direction:",
  cosineSimilarity([1, 0], [1, 0])
);

console.log(
  "Different direction:",
  cosineSimilarity([1, 0], [0, 1])
);

console.log(
  "Same values:",
  cosineSimilarity([1, 1], [1, 1])
);