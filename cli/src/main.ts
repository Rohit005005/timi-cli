import chalk from "chalk";
import figlet from "figlet";

import { Command } from "commander";
import { login, logout, whoami } from "./commands/auth/login";
import { wakeUp } from "./commands/ai/wakeUp";

async function main() {
  console.log(
    chalk.cyanBright.bold(
      figlet.textSync("TIMI CLI", {
        font: "Standard",
        horizontalLayout: "default",
      }),
    ),
  );

  console.log(chalk.greenBright.bold("A cli based AI tool !! \n"));

  const program = new Command("timi-cli");

  program
    .version("0.0.1")
    .description("Cli tool for ai stuff in terminal !!")
    .addCommand(login)
    .addCommand(logout)
    .addCommand(whoami)
    .addCommand(wakeUp);

  program.action(() => {
    program.help();
  });

  program.parse();
}
main().catch((error) => {
  console.log(chalk.red("Error running AI CLI : ", error));
  process.exit(1);
});
