# 🏟️ AlgoArena — Online Code Playground

AlgoArena is a **web-based code editor** that lets you write, run, and experiment with code directly in your browser — no installation needed on your machine. It looks and feels like a real IDE (similar to VS Code), but everything runs in the cloud via Docker.

---

## 🚀 Getting Started

### Prerequisites

You only need **one thing** installed on the machine that will host AlgoArena:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)

That's it. Docker takes care of installing all the programming languages for you.

### Launch the app

```bash
cd playground
docker compose up --build
```

The first build takes a few minutes (downloading language runtimes). After that it starts in seconds.

Once you see the containers are running, open your browser and go to:

```
http://localhost
```

> To stop: press `Ctrl + C` in the terminal, or run `docker compose down`.

---

## 🎯 How to Use It (Student Guide)

### The Interface

When you open AlgoArena, you'll see an interface split into several areas:

```
┌─────────────────────────────────────────────────────┐
│  ⚡ AlgoArena           [Language ▾]  [▶ Run] [⏹]  │  ← Top bar
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│  Files   │           Code Editor                    │  ← Write your code here
│  Panel   │         (Monaco Editor)                  │
│          │                                          │
│          ├──────────────────────────────────────────┤
│          │         Terminal / Output                 │  ← See results here
│          │                                          │
├──────────┴──────────────────────────────────────────┤
│  Status bar                              Timer  ⏱️  │  ← Bottom bar
└─────────────────────────────────────────────────────┘
```

### Step by step

1. **Choose a language** — Click the language dropdown (top bar) to pick from: Python, JavaScript, TypeScript, Java, C, C++, C#, Go, Ruby, or PHP.

2. **Write your code** — Type in the editor. It has syntax highlighting, auto-completion, and bracket matching — just like VS Code.

3. **Click ▶ Run** — Your code is sent to the server, executed, and the output appears in the terminal panel below.

4. **Interactive mode** — If your program reads user input (like `input()` in Python or `Scanner` in Java), the terminal becomes interactive: you can type input and the program responds in real time.

### Managing Projects

- **Create a new project** — Click the projects icon in the sidebar. You can pick a language card, choose a template, or start from scratch.
- **Multiple files** — Click the `+` icon in the file panel to add more files. Great for learning how to split code into modules.
- **Templates** — AlgoArena comes with 50 built-in templates (from "Hello World" to multi-file modular projects) to help you get started quickly.
- **Export/Import** — You can download your project as a `.zip` file, or import one. You can also share a project via URL.

### Supported Languages

| Language | File Extension | Example Command |
|---|---|---|
| 🐍 Python | `.py` | `print("Hello")` |
| 🟨 JavaScript | `.js` | `console.log("Hello")` |
| 🔵 TypeScript | `.ts` | `console.log("Hello")` |
| ☕ Java | `.java` | `System.out.println("Hello");` |
| 🔧 C | `.c` | `printf("Hello\n");` |
| ⚙️ C++ | `.cpp` | `cout << "Hello" << endl;` |
| 🟣 C# | `.cs` | `Console.WriteLine("Hello");` |
| 🐹 Go | `.go` | `fmt.Println("Hello")` |
| 💎 Ruby | `.rb` | `puts "Hello"` |
| 🐘 PHP | `.php` | `echo "Hello\n";` |

---

## 🔧 How It Works Under the Hood

### Architecture Overview

AlgoArena is made of **3 layers**, all running inside Docker:

```
┌─────────────────────────────────────────────────────────┐
│                     Your Browser                        │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   Monaco    │  │   Terminal   │  │  File Manager  │  │
│  │   Editor    │  │  (xterm.js)  │  │  & Projects    │  │
│  └─────┬──────┘  └──────┬───────┘  └────────────────┘  │
│        │ HTTP POST       │ WebSocket                    │
└────────┼─────────────────┼──────────────────────────────┘
         │                 │
    ┌────▼─────────────────▼────┐
    │        Nginx (port 80)    │  ← Reverse proxy
    │  Serves HTML/CSS/JS files │
    │  Forwards /api/* and /ws  │
    └────┬─────────────────┬────┘
         │                 │
    ┌────▼─────────────────▼────┐
    │   Node.js Server (:3000)  │  ← Backend (Express + WS)
    │                           │
    │  Receives code + language  │
    │  Writes files to /tmp      │
    │  Spawns child processes:   │
    │    python3, node, gcc,     │
    │    javac, go, ruby, etc.   │
    │  Captures output → sends   │
    │    back to browser         │
    └───────────────────────────┘
```

### What happens when you click "Run"

Here's the full journey of your code, step by step:

```
1. You click ▶ Run
       │
2. Browser collects all your files + chosen language
       │
3. Sends HTTP POST to /api/execute
   { language: "python", files: [{ name: "main.py", content: "print('Hi')" }] }
       │
4. Nginx forwards the request to the Node.js server
       │
5. Server validates the request (language supported? files ok?)
       │
6. Creates a temporary folder in /tmp with your files
       │
7. Spawns the right command as a child process:
       │
       ├── Python     →  python3 -u main.py
       ├── JavaScript →  node index.js
       ├── TypeScript →  tsc index.ts → node compiled.js
       ├── Java       →  javac *.java → java Main
       ├── C          →  gcc *.c -o main → ./main
       ├── C++        →  g++ *.cpp -o main → ./main
       ├── C#         →  dotnet build → dotnet run
       ├── Go         →  go build -o main → ./main
       ├── Ruby       →  ruby main.rb
       └── PHP        →  php index.php
       │
8. Captures stdout + stderr from the process
       │
9. Sends the output back as the HTTP response
       │
10. Browser displays it in the terminal panel
       │
11. Temporary folder is deleted (cleanup)
```

### Interactive Mode (Terminal) — How WebSockets Enable Real-Time I/O

When you click **▶ Run**, the code is sent via a simple HTTP request and the output comes back in one shot. This works fine for programs that just print output, but **what about programs that ask for user input?** (like `input()` in Python or `Scanner` in Java)

HTTP can't handle that — it's a one-shot request→response protocol. The browser sends the code, waits, and gets one response. There's no way to "type something" mid-execution.

That's where **WebSockets** come in.

#### What is a WebSocket?

A WebSocket is a **persistent, two-way connection** between the browser and the server. Unlike HTTP (which closes after each request), a WebSocket stays open — both sides can send messages to each other at any time. Think of it as a phone call vs. sending letters.

#### How it works step by step

When you open the interactive terminal, here's what happens:

```
 Browser (xterm.js terminal)              Server (Node.js)
           │                                     │
    1.     │── WebSocket: { type: "start",  ────▶│
           │     language: "python",             │
           │     files: [...] }                  │
           │                                     │  2. Server spawns:
           │                                     │     python3 main.py
           │                                     │
           │                                     │  3. Process prints "Enter name: "
           │◀── WebSocket: { type: "stdout", ───│     Server captures stdout
           │     data: "Enter name: " }          │     and forwards it immediately
           │                                     │
           │  4. Terminal displays "Enter name: " │
           │     User types "Alice" + Enter       │
           │                                     │
    5.     │── WebSocket: { type: "stdin",  ────▶│  6. Server pipes "Alice\n"
           │     data: "Alice\n" }               │     into process's stdin
           │                                     │
           │                                     │  7. Process prints "Hello Alice!"
           │◀── WebSocket: { type: "stdout", ───│
           │     data: "Hello Alice!\n" }        │
           │                                     │
           │                                     │  8. Process exits (code 0)
           │◀── WebSocket: { type: "exit",  ────│
           │     code: 0 }                       │
           │                                     │
    9.     │  Connection closed, temp dir cleaned │
```

#### Why WebSockets instead of HTTP?

| | HTTP (`/api/execute`) | WebSocket (`/ws`) |
|---|---|---|
| **Connection** | Opens, sends, receives, closes | Stays open the whole time |
| **Direction** | Browser → Server → Browser (one round trip) | Both sides can send at any time |
| **stdin support** | Must send all input upfront (in the request) | Send input character by character, in real time |
| **Use case** | Simple programs that just print output | Interactive programs that read user input |
| **User experience** | Click Run → see output | Real terminal: type, see response, type again |

#### What happens on each side

**Browser side** (`ExecutionService.js` + `TerminalManager.js`):
- Opens a WebSocket to `ws://server/ws`
- Sends a `start` message with the language and files
- Listens for `stdout`/`stderr` messages → writes them to the xterm.js terminal
- When the user types a key → sends a `stdin` message to the server
- On `exit` message → shows the exit code, closes connection

**Server side** (`executionHandler.js` + `CodeRunner.js`):
- Receives the `start` message → writes files to a temp directory → spawns the child process
- Pipes the child process's `stdout`/`stderr` → sends each chunk as a WebSocket message
- Receives `stdin` messages → writes them to the child process's `stdin` pipe
- When the process exits → sends an `exit` message → cleans up temp files

This is what makes it feel like a **real terminal** — every keystroke travels through the WebSocket in milliseconds.

### Two Execution Strategies

Languages fall into two categories:

**Interpreted** (run directly):
- Python, JavaScript, Ruby, PHP
- The interpreter reads your source code and executes it immediately

**Compiled** (build first, then run):
- C, C++, Go → compiled to a native binary, then executed
- Java → compiled to bytecode (`.class`), then run with `java`
- TypeScript → compiled to JavaScript (`.js`), then run with `node`
- C# → built with `dotnet build`, then run with `dotnet`

### Security & Limits

The server applies several safety measures:

| Protection | Value | Why |
|---|---|---|
| Execution timeout | 30 seconds | Prevents infinite loops from running forever |
| Output limit | 64 KB | Prevents memory exhaustion from huge prints |
| Max files per project | 20 | Prevents abuse |
| Max file size | 256 KB | Prevents uploading huge files |
| Rate limiting | 30 req/window | Prevents spam |
| Non-root user | `algoarena` | Process doesn't run as root inside Docker |
| Path sanitization | ✓ | Filenames like `../../etc/passwd` are rejected |
| tmpfs | 512 MB | Temp files live in RAM, auto-cleaned |

---

## 📁 Project Structure

```
playground/
├── docker-compose.yml          # Orchestrates nginx + app containers
├── Dockerfile                  # Builds the app image with all runtimes
│
├── nginx/
│   └── default.conf            # Nginx config (static files + reverse proxy)
│
├── client/                     # Frontend (served by nginx)
│   ├── index.html              # Main HTML page
│   ├── css/                    # Stylesheets (variables, layout, components)
│   ├── js/                     # JavaScript modules
│   │   ├── main.js             # App entry point — wires everything together
│   │   ├── EditorManager.js    # Monaco editor wrapper (tabs, models, themes)
│   │   ├── FileManager.js      # File tree panel (create, rename, delete files)
│   │   ├── ExecutionService.js # Sends code to server (HTTP + WebSocket)
│   │   ├── TerminalManager.js  # xterm.js terminal (output + interactive input)
│   │   ├── ProjectManager.js   # Project CRUD (localStorage, import/export, share)
│   │   ├── TemplateManager.js  # Loads templates from defaults.json
│   │   ├── UIController.js     # UI state (modals, sidebar, language picker)
│   │   ├── CompletionProvider.js # Basic autocomplete per language
│   │   └── utils.js            # Helpers (file icons, language maps, colors)
│   └── templates/
│       └── defaults.json       # 50 built-in templates across all 10 languages
│
└── server/                     # Backend (Node.js)
    ├── package.json
    └── src/
        ├── index.js            # Server entry point (starts HTTP + WS)
        ├── app.js              # Express app setup
        ├── config.js           # All configurable values (timeouts, limits, etc.)
        ├── routes/
        │   ├── execution.js    # POST /api/execute — batch code execution
        │   └── health.js       # GET /api/health — health check
        ├── services/
        │   └── CodeRunner.js   # Core engine — compiles & runs code in all languages
        ├── websocket/
        │   └── executionHandler.js  # WebSocket handler for interactive terminal
        ├── middleware/
        │   ├── cors.js         # CORS configuration
        │   ├── errorHandler.js # Global error handler
        │   └── rateLimiter.js  # Rate limiting
        └── utils/
            ├── helpers.js      # File prep, path sanitization
            └── logger.js       # Colored console logger
```

---

## ⚙️ Configuration

You can customize behavior via environment variables in `docker-compose.yml`:

| Variable | Default | Description |
|---|---|---|
| `HTTP_PORT` | `80` | Port exposed on your machine |
| `EXEC_TIMEOUT` | `30000` | Max execution time in ms |
| `RATE_MAX_REQ` | `30` | Max API requests per time window |
| `WS_MAX_CONNECTIONS` | `50` | Max concurrent WebSocket sessions |
| `CORS_ORIGIN` | `*` | Allowed origins for API calls |

Example — run on port 8080 with a 10-second timeout:

```bash
HTTP_PORT=8080 EXEC_TIMEOUT=10000 docker compose up --build
```

---

## 🛠️ Development (without Docker)

If you want to run the backend directly on your machine (for development):

```bash
# 1. Install server dependencies
cd playground/server
npm install

# 2. Start the server
node src/index.js
# → API running on http://localhost:3000

# 3. Serve the client (separate terminal)
cd playground/client
python3 -m http.server 8080
# → Open http://localhost:8080
```

> **Note**: You'll need the language runtimes (python3, gcc, java, etc.) installed locally for code execution to work outside Docker.

---

## 📝 Quick Reference for Students

| Action | How |
|---|---|
| Run code | Click ▶ **Run** or press `Ctrl + Enter` |
| Stop execution | Click ⏹ **Stop** |
| Create a file | Click `+` in the file panel |
| Switch language | Use the dropdown in the top bar |
| Open a template | Projects icon → pick a template |
| Export project | Projects modal → **Export ZIP** |
| Import project | Projects modal → **Import ZIP** |
| Share via URL | Projects modal → **Share URL** |

---

*Built with ❤️ as a PFE (Projet de Fin d'Études) project — AlgoArena, a gamified educational platform.*
