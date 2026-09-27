const fs = require("fs");
const path = "./packages/db/prisma/schema.prisma";
let content = fs.readFileSync(path, "utf8");

content = content.replace(/^(\s*)(@@check\(.+\))$/gm, "$1// $2 (enforced at DB level)");
fs.writeFileSync(path, content, "utf8");
console.log("Commented out @@check successfully");
