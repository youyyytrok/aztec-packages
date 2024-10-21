import { chromium, firefox, webkit } from "playwright";
import fs from "fs";
import { Command } from "commander";
import { gunzipSync } from "zlib";
import { decode } from "@msgpack/msgpack";
import chalk from "chalk";
import os from "os";

const { BROWSER } = process.env;

function formatAndPrintLog(message: string): void {
  const parts = message.split("%c");
  if (parts.length === 1) {
    console.log(parts[0]);
    return;
  }
  if (!parts[0]) {
    parts.shift();
  }
  const colors = parts[parts.length - 1].split(" color: ");
  parts[parts.length - 1] = colors.shift()!;

  // console.log({ message, parts, colors });

  let formattedMessage = "";
  for (let i = 0; i < parts.length; i++) {
    const colorValue = colors[i];

    if (colorValue === "inherit" || !colorValue) {
      formattedMessage += parts[i];
    } else if (colorValue.startsWith("#")) {
      formattedMessage += chalk.hex(colorValue)(parts[i]);
    } else {
      formattedMessage += parts[i];
    }
  }

  console.log(formattedMessage);
}

const readStack = (path: string, numToDrop: number): Uint8Array[] => {
  const read = fs.readFileSync(path);
  const unpacked = decode(read.subarray(0, read.length - numToDrop));
  const decompressed = unpacked
    .map(gunzipSync)
    .map((buffer: Buffer) => new Uint8Array(buffer));
  console.log(`stack read!`);
  return decompressed;
};
// Set up the command-line interface
const program = new Command("headless_test");
program.option("-v, --verbose", "verbose logging");
program.option("-c, --crs-path <path>", "ignored (here for compatibility)");

program
  .command("prove_and_verify")
  .description(
    "Generate a proof and verify it. Process exits with success or failure code."
  )
  .option(
    "-b, --bytecode-path <path>",
    "Specify the path to the gzip encoded ACIR bytecode",
    "./target/acir.gz"
  )
  .option(
    "-w, --witness-path <path>",
    "Specify the path to the gzip encoded ACIR witness",
    "./target/witnesses.msgpack"
  )
  .action(async ({ bytecodePath, witnessPath, recursive }) => {
    const witness = readStack(witnessPath, 0);
    const acir = readStack(bytecodePath, 1);
    const threads = Math.min(os.cpus().length, 16);

    const browsers = { chrome: chromium, firefox: firefox, webkit: webkit };

    for (const [name, browserType] of Object.entries(browsers)) {
      if (BROWSER && !BROWSER.split(",").includes(name)) {
        continue;
      }
      console.log(chalk.blue(`Testing ${bytecodePath} in ${name}...`));
      const browser = await browserType.launch();

      const context = await browser.newContext();
      const page = await context.newPage();

      if (program.opts().verbose) {
        page.on("console", (msg) => formatAndPrintLog(msg.text()));
      }

      console.log('going to page');
      await page.goto("http://localhost:8080");
      console.log('went to page');

      const result: boolean = await page.evaluate(
        ([acirData, witnessData, threads]) => {
          console.log("calling runTest");
          return (window as any).runTest(acirData, witnessData, threads);
        },
        [acir, witness, threads]
      );

      await browser.close();

      if (!result) {
        process.exit(1);
      }
    }
  });

program.parse(process.argv);
