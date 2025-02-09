import { generateQueries } from "./main";
import { config } from "../config";

if (!config.schemaGQLEndpoint) {
  console.error("GQL endpoint in config is missing");
  process.exit(0);
}

generateQueries(config);
