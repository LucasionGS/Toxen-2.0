const tree = require("directory-tree");
const { writeFileSync } = require("fs");
writeFileSync("./tree.json", JSON.stringify(tree("./", {
  "exclude": [
    /\b\.vscode\b/,
    /\b\.git\b/,
    /data(\\|\/)settings\.json$/,
    /\bdocs\b/,
  ]
}), null, 2));