import { getSoldComps } from "../soldComps";

async function main() {
  const soldProperties = await getSoldComps(
    "Irvine",
    12,
    10
  );

  console.log(soldProperties);
}

main().catch((error) => {
  console.error("Sold comps test failed:", error);
  process.exit(1);
});