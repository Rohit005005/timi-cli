# Timi AI 

> **The intelligent CLI companion that builds apps and chats with you — right from your terminal.**

[![npm version](https://img.shields.io/npm/v/timi-ai.svg?style=flat-square)](https://www.npmjs.com/package/timi-ai)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg?style=flat-square)](https://opensource.org/licenses/ISC)

**Timi AI** transforms your terminal into a powerful development assistant. Whether you need to scaffold a full-stack Next.js application or just have a conversation about architecture, Timi is ready to help.

---

## 🚀 Features

* **🏗️ Agent Mode (The Builder):** Autonomous application generation. Describe an idea ("Build a Todo app with React"), and Timi will generate files, install dependencies, **verify the build**, and self-repair errors if they occur.
* **💬 Chat Mode (The Expert):** A context-aware chat interface with beautiful Markdown rendering. Discuss code, get explanations, and refine ideas without leaving the CLI.
* **🛠️ Tools Mode (The Assistant):** Quick-access utilities for specific tasks like refactoring, debugging logs, or generating shell commands.
* **🔐 Secure Auth:** Enterprise-grade security using GitHub Device Flow authentication.
* **🎨 Beautiful UI:** A polished terminal experience featuring syntax highlighting, spinners, and formatted boxes.

---

## 📦 Installation

Install Timi globally via npm to access it from anywhere:

```bash
npm install -g timi-ai
```

---

## ⚡ Getting Started

1. **Authenticate**
   Before using Timi, you need to link your GitHub account. This creates a secure session for your device.
   ```bash
   timi login
   ```

    Follow the on-screen instructions to enter your device code.

2. **Launch** Once logged in, simply run.

    ```bash
    timi
    ```
    This will open the interactive menu where you can select your desired mode.

---

## 🎮 Modes Explained

* ### **Agent Mode 🏗️**

#### "Turn text into software."

Agent Mode is designed for scaffolding and prototyping.

1. **Describe** : Tell Timi what you want to build (e.g., "A car driving game using Next.js").

2. **Generate** : Timi creates the folder structure and writes the code.

3. **Verify & Fix** : Timi runs npm run build to verify the application. If the build fails, it analyzes the error and automatically repairs the code until it works.

 * ### **Chat Mode 💬**

#### "Your coding partner."

A persistent chat session powered by Gemini.

1. **Context Aware** : Timi remembers previous messages in the conversation.

2. **Rich Formatting** : Code blocks, lists, and bold text are rendered beautifully in your terminal.

3. **Editor Support** : Need to type a long prompt? Type /edit to open your default text editor (Vim, Nano, VS Code) for multi-line input.

---

## 🛠️ Tech Stack

Built with modern tools for a seamless developer experience:

- Runtime: Node.js & TypeScript

- AI: Vercel AI SDK

- UI: @clack/prompts, boxen, chalk, yocto-spinner

- Markdown: marked, marked-terminal

- Auth: better-auth

---


<p align="center"> Made with ❤️ by Rohit </p>
