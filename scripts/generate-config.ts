import fs from "fs";

const filePath = "config.ts";

if (!fs.existsSync(filePath)) {
  const content = `import { CLIConfig } from "./src/types";

export const config: CLIConfig = {
  schemaGQLEndpoint: "",
};
`;

  fs.writeFileSync(filePath, content, "utf8");
  console.log("✅ config.ts file has been generated successfully.");
} else {
  console.log("⚠️ config.ts already exists. Skipping generation.");
}
