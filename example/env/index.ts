import { PackEnvLoad } from "../worker/env.worker";

console.log()

const worker = new Worker("lib/worker/env.worker.js");

const request = { source: "https://localhost/data/result/config.json" } as PackEnvLoad;

worker.postMessage(request);
worker.onmessage = (event: MessageEvent) => {
    console.log(event.data);
}