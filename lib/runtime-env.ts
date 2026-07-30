import { env as workerEnv } from "cloudflare:workers";

type WorkerEnvRecord = Record<string, unknown>;

function readWorkerEnv(name: string) {
  const record = workerEnv as WorkerEnvRecord | undefined;
  const value = record?.[name];
  return typeof value === "string" ? value : undefined;
}

export function getRuntimeEnv(name: string) {
  return process.env[name] ?? readWorkerEnv(name);
}

export function getRequiredRuntimeEnv(name: string) {
  const value = getRuntimeEnv(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function hasRuntimeEnv(name: string) {
  return Boolean(getRuntimeEnv(name));
}
