import { promises as fs } from "fs";
import path from "path";
import chalk from "chalk";
import { generateObject } from "ai";
import { z } from "zod";

import yoctoSpinner from "yocto-spinner";
import { AiService } from "../ai/services/ai.service";

const ApplicationSchema = z.object({
  folderName: z.string().describe("Kebab-Case folder name for the application"),
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
        version: z.string().describe("Version of the package"),
      }),
    )
    .optional()
    .describe("Npm dependencies with versions"),
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
      1. Generate all files needed for the application to run.
      2. Include package.json will all packages and correct versions.
      3. Include README.md with setup instructions.
      4. Include configuration files (.gitignore, etc.)
      5. Write clean, well-commented, production-ready code.
      6. Include error handling and input validation.
      7. Use modern JavaScript/TypeScript best practices.
      8. Make sure all imports and paths are correct.
      9. NO PLACEHOLDERS - everything must be complete and working.

      Provide:
      - A meaningful kebab-case folder name
      - ALL necessary files with complete content
      - Setup commands (cd folder, npm install, npm run dev, etc.)
      - All dependencies with versions`,
    });

    spinner.stop();
    const application = result.object;

    printMessage(chalk.green(`\n Generated: ${application.folderName}`));

    printMessage(chalk.gray(`Description: ${application.description}`));

    if (application.files.length === 0) {
      throw new Error("No files were generated");
    }

    displayFileTree(application.files, application.folderName);

    printMessage(chalk.cyan("\n Creating files...\n"));

    const appdir = await createApplicationFiles(
      cwd,
      application.folderName,
      application.files,
    );

    printMessage(chalk.green.bold(`\n Application created successfully\n`));
    printMessage(chalk.cyan(`Location: ${chalk.bold(appdir)}\n`));

    if (application.setupCommands.length > 0) {
      printMessage(chalk.cyan("Next Steps: \n"));
      printMessage(chalk.white("```bash"));
      application.setupCommands.forEach((cmd) => {
        printMessage(chalk.white(cmd));
      });

      printMessage(chalk.white("```\n"));
    }

    return {
      folderName: application.folderName,
      appdir,
      files: application.files.map((file) => file.path),
      commands: application.setupCommands,
      success: true,
    };
  } catch (error) {
    printMessage(chalk.red(`\n Error generating application: ${error}`));
    throw error;
  }
}
