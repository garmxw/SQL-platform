import { spawn } from "child_process";

export function runMySQL(query) {
  return new Promise((resolve, reject) => {
    const docker = spawn("docker", [
      "exec",
      "-i",
      "sql-mysql-mvp",
      "mysql",
      "-uroot",
      "-proot",
      "sandbox",
      "-B", // batch mode (clean output)
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
        return reject(stderr || `Exited with code ${code}`);
      }
      resolve(stdout.trim());
    });

    // send SQL
    docker.stdin.write(query + ";\n");
    docker.stdin.end();
  });
}
