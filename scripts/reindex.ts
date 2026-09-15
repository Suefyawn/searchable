import "dotenv/config";
import { assertDevServerStopped } from "./_guard";
import { reindexAll } from "../src/lib/indexers";

assertDevServerStopped()
  .then(() => reindexAll())
  .then((counts) => {
    console.log("✓ reindexed", counts);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
