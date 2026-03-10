import { spawn } from "child_process";

export function runSQLite(query) {
  return new Promise((resolve, reject) => {
    const docker = spawn("docker", [
      "exec",
      "-i",
      "sql-sqlite-mvp", // container name
      "sqlite3",
      "/sandbox/sandbox.db",
      "-batch",
      "-header",
      "-separator",
      "\t",
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
        return reject(stderr.trim() || `Exited with code ${code}`);
      }
      resolve(stdout.trim());
    });

    docker.stdin.write(query.trim() + ";\n");
    docker.stdin.end();
  });
}
