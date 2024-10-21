import createDebug from "debug";
import { inflate } from "pako";
import { readFileSync } from "fs";
import { decode } from "@msgpack/msgpack";
import { gunzipSync } from 'zlib';
import acirs from "./assets/acir.msgpack";
import witnesses from "./assets/witnesses.msgpack";

const readStack = (read: Buffer, numToDrop: number): Uint8Array[] => {
  const unpacked = decode(read.subarray(0, read.length - numToDrop));
  const decompressed = unpacked
    .map(gunzipSync)
    .map((buffer: Buffer) => new Uint8Array(buffer));
  console.log(`stack read!`);
  return decompressed;
};


createDebug.enable("*");
const debug = createDebug("browser-test-app");

async function runTest(
  acirs: Uint8Array[],
  witnesses: Uint8Array[],
  threads?: number
) {
  console.log("about to 'import' backend type...");
  const { AztecClientBackend } = await import("@aztec/bb.js");

  console.log("starting test...");
  console.log(`input lengths after reading to Uint8Array's: ${acirs.length} and ${witnesses.length}`)
  const backend = new AztecClientBackend(acirs, { threads });
  const proof = await backend.generateProof(witnesses);
  console.log("generated proof");

  await backend.destroy();

  return false;
}

(window as any).runTest = runTest;

function base64ToUint8Array(base64: string) {
  console.log(`input string length ${base64.length}`);
  let binaryString = atob(base64);
  let len = binaryString.length;
  console.log(`binary string length ${len}`);
  let bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}


document.addEventListener("DOMContentLoaded", function () {
  const button = document.createElement("button");
  button.innerText = "Run Test";
  button.addEventListener("click", () => runTest(readStack(acirs as unknown as Buffer, 0) , readStack(witnesses as unknown as Buffer, 1)));
  document.body.appendChild(button);
});
