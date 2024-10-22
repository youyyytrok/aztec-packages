import createDebug from "debug";
import { ungzip } from "pako";
import { decode } from "@msgpack/msgpack";
import acirs from "./assets/acir.b64";
import witnesses from "./assets/witnesses.b64";

const readStack = (read: Uint8Array, numToDrop: number): Uint8Array[] => {
  const unpacked = decode(read.subarray(0, read.length - numToDrop)) as Uint8Array[];
  const decompressed = unpacked.map((arr: Uint8Array) => ungzip(arr));
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
  console.log("running test");
  button.addEventListener("click", () =>
    runTest(
      readStack(base64ToUint8Array(acirs), 1),
      readStack(base64ToUint8Array(witnesses), 0)
    )
  );
  document.body.appendChild(button);
});
