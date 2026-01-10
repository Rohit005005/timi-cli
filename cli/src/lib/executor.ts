import { spawn } from "child_process";

type CommandResult = {
  success: boolean;
  output: string;
  error?: string;
};
export async function runCommand(
  command: string,
  cwd: string,
  isLongRunning = false,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, [], { cwd, shell: true });

    let stdout = "";
    let stderr = "";
    let timer: NodeJS.Timeout;

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    if (isLongRunning) {
      timer = setTimeout(() => {
        child.kill();
        resolve({ success: true, output: stdout });
      }, 5000);
    }

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);

      if (code === 0 || code === null) {
        resolve({ success: true, output: stdout });
      } else {
        resolve({
          success: false,
          output: stdout,
          error: stderr || stdout || "Unknown error occurred",
        });
      }
    });

    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      resolve({ success: false, output: stdout, error: err.message });
    });
  });
}
