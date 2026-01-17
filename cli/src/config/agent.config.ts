import { promises as fs } from "fs";
import path from "path";
import chalk from "chalk";
import { generateObject } from "ai";
import { z } from "zod";

import yoctoSpinner from "yocto-spinner";
import { AiService } from "../ai/services/ai.service";
import { runCommand } from "../lib/executor";

const ApplicationSchema = z.object({
  folderName: z.string().describe("Kebab-Case folder name for the application"),
  packageManager: z
    .enum(["npm", "pnpm", "yarn", "bun", "pip", "cargo", "go", "none"])
    .describe(
      "The package manager to use. Use 'none' for simple scripts/binaries",
    ),
  description: z.string().describe("Breif description about what was created"),
  files: z.array(
    z
      .object({
        path: z.string().describe("Relative file path"),
        content: z.string().describe("Complete file content"),
      })
      .describe("All files needed for the application"),
  ),
  setupCommands: z.array(z.string().describe("Bash commands to setup and run")),
  dependencies: z
    .array(
      z.object({
        name: z.string().describe("Name of the package"),
        version: z.string().optional().describe("Version of the package"),
      }),
    )
    .optional()
    .describe("Npm dependencies with versions"),
});

const RepairSchema = z.object({
  explaination: z
    .string()
    .describe("Explanation of what caused the error and how it was fixed"),
  files: z
    .array(
      z.object({
        path: z.string().describe("Relative file path to overwrite"),
        content: z.string().describe("Corrected file content"),
      }),
    )
    .describe("Only the files that needed changes"),
  setupCommands: z.array(
    z.string().describe("UPdated setup commands if necessary"),
  ),
});

type ApplicationType = z.infer<typeof ApplicationSchema>;

function printMessage(message: string) {
  console.log(message);
}

function displayFileTree(files: ApplicationType["files"], folderName: string) {
  printMessage(chalk.green("\n Project Structure: "));
  printMessage(chalk.white(`${folderName}`));

  const filesByDir: Record<string, string[]> = {};
  files.forEach((file) => {
    const parts = file.path.split("/");
    const dir = parts.length > 1 ? parts.slice(0, -1).join("/") : "";

    if (!filesByDir[dir]) {
      filesByDir[dir] = [];
    }

    filesByDir[dir].push(parts[parts.length - 1] || "");
  });

  Object.keys(filesByDir)
    .sort()
    .forEach((dir) => {
      if (dir) {
        printMessage(chalk.white(`|-- ${dir}/`));
        (filesByDir[dir] || []).forEach((file) => {
          printMessage(chalk.white(`|  |__ ${file}`));
        });
      } else {
        (filesByDir[dir] || []).forEach((file) => {
          printMessage(chalk.white(` |__ ${file}`));
        });
      }
    });
}

async function createApplicationFiles(
  cwd: string,
  folderName: string,
  files: ApplicationType["files"],
) {
  const appDir = path.join(cwd, folderName);

  await fs.mkdir(appDir, { recursive: true });

  printMessage(chalk.cyan(`Created directory: ${folderName}/`));

  for (const file of files) {
    const filePath = path.join(appDir, file.path);
    const fileDir = path.dirname(filePath);

    await fs.mkdir(fileDir, { recursive: true });
    await fs.writeFile(filePath, file.content, "utf-8");
    printMessage(chalk.green(`Done: ${file.path}`));
  }

  return appDir;
}

async function attemptRepair(
  error: string,
  command: string,
  aiService: AiService,
  currentFiles: ApplicationType["files"],
  packageManager: string,
) {
  printMessage(chalk.yellow(`\nError detected during: ${chalk.bold(command)}`));
  printMessage(chalk.red(`${error.slice(0, 300)}...`));
  printMessage(chalk.magenta("Attempting self-repair... 🔧"));

  const fileStructure = currentFiles.map((f) => f.path).join(", ");
  const result = await generateObject({
    model: aiService.model,
    schema: RepairSchema,
    prompt: `
        I generated an application using **${packageManager}**.
        The file structure is: [${fileStructure}].

        When running the command "${command}", I got this error:
        ${error}

        Please analyze the error and generate the FIXED content for the specific files causing the issue.
        - Do not regenerate files that are already correct.
        - Ensure all code is compatible with ${packageManager}.
      `,
  });

  return result.object;
}

export async function generateApplication(
  description: string,
  aiService: AiService,
  cwd = process.cwd(),
) {
  try {
    printMessage(chalk.cyan.bold("Agent Mode\n"));
    printMessage(chalk.gray(`Request: ${description}`));

    printMessage(chalk.magenta("Agent Response: "));

    const spinner = yoctoSpinner({
      text: "Generating you application...",
    }).start();

    const result = await generateObject({
      model: aiService.model,
      schema: ApplicationSchema,
      prompt: `Create a complete, production ready application for: ${description}

      CRITICAL REQUIREMENTS:
      1. Detect the best language and tools for the job (Node.js, Python, Go, C++, etc).
      2. Generate ALL necessary files.
      3. Include the correct dependency file for the language (package.json, requirements.txt, go.mod, Cargo.toml, etc).
      4. Include README.md with setup instructions.
      5. Write clean, well-commented code.
      6. NO PLACEHOLDERS, everything must be complete and working.

      MANDATORY:
      - You MUST choose the correct 'packageManager' field in the schema.
      - For Python, use 'pip'.
      - For Go, use 'go'.
      - For Rust, use 'cargo'.
      - For C++/Shell, use 'none'.`,
    });

    spinner.stop();
    const application = result.object;

    let currentFiles = application.files;

    printMessage(chalk.green(`\n Generated: ${application.folderName}`));

    const appDir = await createApplicationFiles(
      cwd,
      application.folderName,
      currentFiles,
    );
    printMessage(chalk.cyan(`Files created at: ${appDir}`));

    const MAX_RETRIES = 3;
    const pm = application.packageManager;

    if (pm !== "none") {
      printMessage(chalk.yellow(`\n Installing dependencies with ${pm}...`));
      let installCmd = `${pm} install`;
      if (pm === "pip") installCmd = "pip install -r requirements.txt";
      if (pm === "go") installCmd = "go mod download";
      if (pm === "cargo") installCmd = "cargo build";

      let installSuccess = false;
      let installAttempts = 0;

      while (!installSuccess && installAttempts < MAX_RETRIES) {
        const res = await runCommand(installCmd, appDir);

        if (res.success) {
          printMessage(chalk.green("Dependencies installed."));
          installSuccess = true;
        } else {
          installAttempts++;
          printMessage(
            chalk.red(
              `Install failed (Attempt ${installAttempts}/${MAX_RETRIES})`,
            ),
          );

          const repair = await attemptRepair(
            res.error || "Unknown error",
            installCmd,
            aiService,
            currentFiles,
            pm,
          );

          printMessage(chalk.green(` Applying fix: ${repair.explaination}`));

          await createApplicationFiles(
            cwd,
            application.folderName,
            repair.files,
          );

          repair.files.forEach((f) => {
            const idx = currentFiles.findIndex((cf) => cf.path === f.path);
            if (idx !== -1) currentFiles[idx] = f;
            else currentFiles.push(f);
          });
        }
      }
    } else {
      printMessage(
        chalk.gray("Skipping dependency install (No package manager needed)"),
      );
    }

    printMessage(chalk.yellow("\nVerifying application..."));

    for (let cmd of application.setupCommands) {
      if (cmd.includes("install") || cmd.includes("mod download")) continue;

      if (["npm", "pnpm", "yarn", "bun"].includes(pm)) {
        if (
          !cmd.startsWith(pm) &&
          (cmd.startsWith("npm") || cmd.startsWith("bun"))
        ) {
          cmd = cmd.replace(/^(npm|bun|yarn|pnpm)/, pm);
        }
      }

      let cmdSuccess = false;
      let cmdAttempts = 0;

      while (!cmdSuccess && cmdAttempts < MAX_RETRIES) {
        printMessage(chalk.gray(`Running: ${cmd}`));

        const isLongRunning =
          cmd.includes("start") ||
          cmd.includes("dev") ||
          cmd.includes("serve") ||
          cmd.includes("python") ||
          cmd.startsWith("./");

        const res = await runCommand(cmd, appDir, isLongRunning);

        if (res.success) {
          printMessage(chalk.green(`✅ Command passed: ${cmd}`));
          cmdSuccess = true;
        } else {
          cmdAttempts++;
          printMessage(
            chalk.red(
              `❌ Command failed (Attempt ${cmdAttempts}/${MAX_RETRIES})`,
            ),
          );

          const repair = await attemptRepair(
            res.error || "Unknown Error",
            cmd,
            aiService,
            currentFiles,
            pm,
          );

          printMessage(chalk.green(`  Applying fix: ${repair.explaination}`));
          await createApplicationFiles(
            cwd,
            application.folderName,
            repair.files,
          );

          repair.files.forEach((f) => {
            const idx = currentFiles.findIndex((cf) => cf.path === f.path);
            if (idx !== -1) currentFiles[idx] = f;
            else currentFiles.push(f);
          });
        }
      }
    }
    printMessage(chalk.green.bold(`\nApplication is ready and verified!\n`));

    printMessage(chalk.green("\n Final Project Structure:"));
    displayFileTree(currentFiles, application.folderName);

    printMessage(chalk.cyan("\nNext Steps:"));
    printMessage(chalk.white(`1. cd ${application.folderName}`));

    const postSetupCommands = application.setupCommands.filter(
      (cmd) => !cmd.includes("install") && !cmd.includes("mod download"),
    );

    postSetupCommands.forEach((cmd, index) => {
      let displayCmd = cmd;
      if (["npm", "pnpm", "yarn", "bun"].includes(pm)) {
        displayCmd = cmd.replace(/^(npm|bun|yarn|pnpm)/, pm);
      }
      printMessage(chalk.white(`${index + 2}. ${displayCmd}`));
    });

    printMessage("");
    return {
      folderName: application.folderName,
      appDir: appDir,
      files: application.files.map((file) => file.path),
      commands: application.setupCommands,
      success: true,
    };
  } catch (error) {
    printMessage(chalk.red(`\n Error generating application: ${error}`));
    throw error;
  }
}
