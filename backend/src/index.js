import express from "express";
import executionRouter from "./routes/execution.js";
// import pg from "pg";
//import { execSync } from "child_process";
//import { v4 as uuidv4 } from "uuid";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api", executionRouter);

// app.get("/", (req, res) => {
//   res.send("Welcome to the SQL Sandbox API");
// });

// app.post("/executeSql", async (req, res) => {
//   const { sql, engine } = req.body;
//   if (!sql && !engine)
//     return res.status(400).json({ error: "SQL query and engine are required" });
//   const containerName = `sql_sandbox_${uuidv4()}`;
//   //const port = 5500 + Math.floor(Math.random() * 1000); // Random port between 5500 and 6499

//   //for simplicity, we will use a fixed port. In production, you should implement a more robust port management strategy to avoid conflicts.

//   const port = 5555;
//    // cuz docker run -d --name sql_sandbox_1 -p 5555:5432 --memory=512m --cpus=0.5 --network=none sql-sandbox-image

//   try {
//     execSync(
//       `docker run -d --name ${containerName} -p ${port} --memory=512m --cpus=0.5 --network=none sql-sandbox-image`,
//     );
//     const client = new pg.Client({
//       host: "localhost",
//       port,
//       user: "sandbox_user",
//       password: "sandbox_pass",
//       database: "sandbox_db",
//     });
//     await client.connect();

//     const result = await client.query(sql);
//     await client.end();
//     console.log(result);
//     res.json({
//       columns: result.fields?.map((field) => field.name),
//       rows: result.rows,
//     });
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   } finally {
//     try {
//       execSync(`docker rm -f ${port}`);
//     } catch (error) {
//       console.log(error.message);
//     }
//   }
// });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
