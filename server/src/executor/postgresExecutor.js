import { spawn } from "child_process";

export function runPostgres(query) {
  return new Promise((resolve, reject) => {
    const docker = spawn("docker", [
      "exec",
      "-i",
      "sql-postgres-mvp",
      "psql",
      "-U",
      "postgres",
      "-d",
      "sandbox",
      "-A", // unaligned
      "-F",
      "\t", // tab-separated
      "-q", // quiet
    ]);

    let stdout = "";
    let stderr = "";

    docker.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    docker.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    docker.on("close", (code) => {
      if (code !== 0) {
        return reject(stderr.trim());
      }
      resolve(stdout.trim());
    });

    docker.stdin.write(query.trim() + ";\n");
    docker.stdin.end();
  });
}
