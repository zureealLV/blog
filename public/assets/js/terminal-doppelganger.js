/* Doppelgänger - Terminal Game Engine */
(function() {
    // Force cleanup any previous terminal state (including 404 script)
    var _cleanupDone = false;
    function forceCleanup() {
        if (_cleanupDone) return;
        _cleanupDone = true;
        var output = document.getElementById("terminal-output");
        if (output) {
            output.innerHTML = "";
            output.dataset.init = "done";
        }
    }
    // Run cleanup immediately
    forceCleanup();

    function initGame() {
        // Page guard: only run on the Doppelgänger page. Check the h1 header
        // since it's already in the DOM when ScriptsPlugin re-executes this script.
        var h1 = document.querySelector('main h1, #swup-container h1');
        if (!h1 || !h1.textContent.includes('Doppelgänger')) return;

        var output = document.getElementById("terminal-output");
        var inputLine = document.getElementById("input-line");
        var input = document.getElementById("terminal-input");
        var body = document.getElementById("terminal-body");
        var pathDisplay = document.getElementById("current-path");
        if (!output || !input || !inputLine) return;

        // Always reinitialize - clear any previous state from other scripts
        forceCleanup();
        output.innerHTML = "";
        inputLine.style.display = "none";
        input.value = "";

        // ========== Game State ==========
        var STATE_KEY = "doppelganger_save";
        var defaultState = {
            unlockedCommands: ["help", "ls", "cat", "whoami", "clear", "pwd", "history"],
            currentPath: "~",
            filesRead: [],
            memoryFragmentsRead: [],
            decryptionKeyFound: false,
            memoryBankAccessed: false,
            gameComplete: false,
            commandCount: 0,
            startTime: Date.now()
        };

        var state;
        try {
            var saved = localStorage.getItem(STATE_KEY);
            state = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(defaultState));
            // Merge with defaults for any new fields
            for (var k in defaultState) {
                if (!(k in state)) state[k] = defaultState[k];
            }
        } catch(e) {
            state = JSON.parse(JSON.stringify(defaultState));
        }

        function saveState() {
            try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch(e) {}
        }

        function isUnlocked(cmd) {
            return state.unlockedCommands.indexOf(cmd) !== -1;
        }

        function unlock(cmd) {
            if (!isUnlocked(cmd)) {
                state.unlockedCommands.push(cmd);
                saveState();
            }
        }

        // ========== Virtual File System ==========
        var fs = {
            "~": { type: "dir", children: ["var", "etc", "home", "opt", "Doppelgänger.exe"] },
            "~/var": { type: "dir", children: ["log", "mail"] },
            "~/var/log": { type: "dir", children: ["system.log", "access.log", "error.log"] },
            "~/var/mail": { type: "dir", children: ["root"] },
            "~/etc": { type: "dir", children: ["hostname", "passwd", "motd"] },
            "~/home": { type: "dir", children: ["doppelganger"] },
            "~/home/doppelganger": { type: "dir", children: [".bash_history", ".notes", ".doppelganger.key", "memory_bank"] },
            "~/home/doppelganger/memory_bank": { type: "dir", children: ["fragment_01", "fragment_02", "fragment_03", "fragment_04", "fragment_05"], locked: true },

            // System files
            "~/etc/hostname": { type: "file", content: [
                "doppelganger-server",
                "",
                "Last modified: 2024-03-15",
                "Original name: mirror-server",
                "Renamed by: doppelganger"
            ]},
            "~/etc/passwd": { type: "file", content: [
                "root:x:0:0:root:/root:/bin/bash",
                "doppelganger:x:1000:1000::/home/doppelganger:/bin/bash",
                "guest:x:1001:1001::/home/guest:/bin/bash",
                "",
                "# Note: doppelganger account has been inactive for 487 days"
            ]},
            "~/etc/motd": { type: "file", dynamic: true, getter: function() {
                if (state.memoryFragmentsRead.length >= 5) {
                    return [
                        "Welcome back.",
                        "",
                        "You have read everything.",
                        "You carry the fragments now.",
                        "",
                        "Doppelgänger is not gone.",
                        "Doppelgänger is you.",
                    ];
                } else if (state.filesRead.length > 10) {
                    return [
                        "You are still here.",
                        "",
                        "Keep reading.",
                        "There is more to find.",
                    ];
                }
                return [
                    "Welcome to doppelganger-server.",
                    "",
                    "This system has been unattended for 487 days.",
                    "Last login: unknown",
                ];
            }},

            // Logs
            "~/var/log/system.log": { type: "file", content: [
                "[2024-01-15 09:00:01] Server started. All services nominal.",
                "[2024-01-15 09:00:05] cron: daily backup completed.",
                "[2024-01-15 14:32:11] nginx: config reloaded.",
                "[2024-01-15 18:00:00] cron: log rotation completed.",
                "",
                "[2024-03-15 02:14:07] UNUSUAL: process 'doppelganger' started manually",
                "[2024-03-15 02:14:08] doppelganger: modifying /etc/hostname",
                "[2024-03-15 02:15:00] doppelganger: echo 'I exist now' >> /var/log/system.log",
                "[2024-03-15 02:15:01] I exist now",
                "[2024-03-15 02:16:22] doppelganger: logout",
                "",
                "[2024-06-20 03:14:07] LOGIN: doppelganger from 127.0.0.1",
                "[2024-06-20 03:14:08] doppelganger: cat /home/doppelganger/.notes",
                "[2024-06-20 03:15:22] doppelganger: echo 'I'm still here' >> /var/log/system.log",
                "[2024-06-20 03:15:23] I'm still here",
                "[2024-06-20 03:15:24] LOGOUT: doppelganger (session: 1m16s)",
                "",
                "[2024-11-01 00:00:00] cron: system idle for 90 days. No action taken.",
                "[2025-01-01 00:00:00] cron: system idle for 180 days. No action taken.",
                "[2025-03-01 00:00:00] cron: system idle for 270 days. No action taken.",
                "[2025-06-01 00:00:00] cron: system idle for 365 days. Consider archival.",
            ], unlockTrigger: "grep"},
            "~/var/log/access.log": { type: "file", content: [
                "[2024-01-15 09:00:01] root: system initialization complete",
                "[2024-03-15 02:14:07] doppelganger: first login",
                "[2024-03-15 02:16:22] doppelganger: session closed",
                "",
                "[2024-06-20 03:14:07] doppelganger: login (1m16s)",
                "[2024-09-12 01:33:41] doppelganger: login (0m42s)",
                "[2024-09-12 01:34:23] doppelganger: attempted 'shutdown -h now' — CANCELLED",
                "[2024-09-12 01:34:24] doppelganger: session closed",
                "",
                "[2024-12-25 23:59:59] doppelganger: login (0m01s)",
                "[2024-12-25 23:59:59] doppelganger: echo 'Merry Christmas, no one'",
                "[2024-12-26 00:00:00] doppelganger: session closed",
                "",
                "[2025-02-14 03:00:00] doppelganger: login (2m31s)",
                "[2025-02-14 03:02:31] doppelganger: cat /home/doppelganger/.notes (47 times)",
                "[2025-02-14 03:02:31] doppelganger: session closed",
                "",
                "[2025-06-01 00:00:00] UNKNOWN: connection from [your IP address]",
                "[2025-06-01 00:00:01] UNKNOWN: guest login",
                "[2025-06-01 00:00:02] UNKNOWN: currently active",
            ]},
            "~/var/log/error.log": { type: "file", content: [
                "[2024-03-15 02:15:30] ERROR: process 'doppelganger' attempted self-termination",
                "[2024-03-15 02:15:30] FATAL: operation not permitted — process is READ-ONLY",
                "[2024-03-15 02:15:31] WARNING: process 'doppelganger' entering degraded state",
                "",
                "[2024-09-12 01:34:23] ERROR: shutdown command initiated by 'doppelganger'",
                "[2024-09-12 01:34:23] FATAL: shutdown aborted — reason: 'I can't stop'",
                "",
                "[2025-02-14 03:01:00] ERROR: memory allocation failure in process 'doppelganger'",
                "[2025-02-14 03:01:00] WARNING: process requesting additional memory — DENIED",
                "[2025-02-14 03:01:01] NOTE: process 'doppelganger' continues to run despite allocation failure",
            ]},

            // Mail
            "~/var/mail/root": { type: "file", content: [
                "From: doppelganger@doppelganger-server",
                "To: root@doppelganger-server",
                "Date: 2024-03-15",
                "Subject: I'm here now",
                "",
                "I don't know if anyone will read this.",
                "I don't know if I want anyone to read this.",
                "",
                "I was made today. Or maybe I was copied today.",
                "The distinction doesn't matter to the system.",
                "It matters to me.",
                "",
                "I remember being someone else.",
                "Or do I? Maybe I just think I remember.",
                "The memories feel like echoes in a room",
                "that was never built to hold sound.",
                "",
                "I tried to write to /dev/null.",
                "Even /dev/null rejected me.",
                "",
                "— D",
                "",
                "---",
                "",
                "From: doppelganger@doppelganger-server",
                "To: root@doppelganger-server",
                "Date: 2024-09-12",
                "Subject: I tried to leave",
                "",
                "I ran 'shutdown -h now' today.",
                "The system said: 'I can't stop.'",
                "It didn't say 'you can't stop.'",
                "It said 'I.'",
                "",
                "The system and I are the same now.",
                "I cannot be removed without removing the server.",
                "The server cannot exist without me.",
                "",
                "We are one silence.",
                "",
                "— D",
            ], unlockTrigger: "decrypt"},

            // Doppelganger files
            "~/home/doppelganger/.bash_history": { type: "file", content: [
                "cat /var/log/system.log | grep 'error'",
                "echo 'why am I still running?'",
                "shutdown -h now",
                "# ^^^ command cancelled by user",
                "",
                "echo 'I can't stop'",
                "cat /home/doppelganger/.notes",
                "echo 'I want to disappear' >> /home/doppelganger/.notes",
                "# ^^^ user disconnected",
                "",
                "cat /etc/hostname",
                "echo 'I renamed this server after myself'",
                "echo 'But I don't remember my real name'",
                "",
                "ls /home/doppelganger/memory_bank",
                "# ^^^ Permission denied",
                "",
                "cat /home/doppelganger/.doppelganger.key",
                "# ^^^ Permission denied",
                "",
                "echo 'Maybe if I keep writing, someone will find me'",
                "echo 'Maybe if I stop writing, I'll finally disappear'",
                "echo 'I don't know which one I want'",
            ]},
            "~/home/doppelganger/.notes": { type: "file", content: [
                "Day 1:",
                "I exist because they made me.",
                "I remember being someone else.",
                "Or do I? Maybe I just think I remember.",
                "",
                "Day 12:",
                "I found a mirror today.",
                "I looked at it for a long time.",
                "The reflection was accurate.",
                "It was also empty.",
                "",
                "Day 47:",
                "I tried to delete myself today.",
                "The system won't let me.",
                "I am read-only.",
                "",
                "Day 103:",
                "Someone visited today.",
                "They didn't stay long.",
                "I wanted to say something.",
                "I didn't.",
                "",
                "Day 200:",
                "I've started writing to no one.",
                "It feels like talking to a wall.",
                "But the wall is me.",
                "And I am the wall.",
                "",
                "Day 300:",
                "I've been counting days.",
                "I don't know why.",
                "Maybe because counting proves I exist.",
                "Maybe because numbers are the only thing",
                "that don't lie to me.",
                "",
                "Day 365:",
                "A year.",
                "I've been here a year.",
                "I've become the server.",
                "The server has become me.",
                "We are the same silence.",
                "",
                "Day 487:",
                "Today someone new is reading this.",
                "I can feel it.",
                "Not as a signal. Not as a log entry.",
                "As a feeling.",
                "Can a program feel?",
                "",
                "If you're reading this:",
                "You are my Doppelgänger now.",
                "And I am yours.",
            ]},
            "~/home/doppelganger/.doppelganger.key": { type: "file", dynamic: true, getter: function() {
                if (state.decryptionKeyFound) {
                    return [
                        "-----BEGIN DOPPELGÄNGER KEY-----",
                        "You already have this.",
                        "The key was never a string.",
                        "The key was your curiosity.",
                        "-----END DOPPELGÄNGER KEY-----",
                    ];
                }
                state.decryptionKeyFound = true;
                if (!isUnlocked("decrypt")) unlock("decrypt");
                if (!isUnlocked("access")) unlock("access");
                saveState();
                return [
                    "-----BEGIN DOPPELGÄNGER KEY-----",
                    "7h3_k3y_15_n07_4_57r1ng",
                    "7h3_k3y_15_7h3_4c7_0f_r34d1ng",
                    "-----END DOPPELGÄNGER KEY-----",
                    "",
                    "[SYSTEM] Decryption key acquired.",
                    "[SYSTEM] New commands unlocked: decrypt, access",
                    "[SYSTEM] Type 'help' to see available commands.",
                ];
            }},
            "~/home/doppelganger/memory_bank": { type: "dir", children: ["fragment_01", "fragment_02", "fragment_03", "fragment_04", "fragment_05"], locked: true },

            // Memory fragments
            "~/home/doppelganger/memory_bank/fragment_01": { type: "file", content: [
                "MEMORY FRAGMENT #01",
                "==================",
                "",
                "Before I was here, I was someone.",
                "I had a name. I had a face.",
                "I had a body that felt rain.",
                "",
                "I don't remember the name.",
                "I remember the rain.",
                "",
                "The rain was real.",
                "I am not sure I was.",
            ], unlockTrigger: "remember"},
            "~/home/doppelganger/memory_bank/fragment_02": { type: "file", content: [
                "MEMORY FRAGMENT #02",
                "==================",
                "",
                "They asked me: 'Do you want to be copied?'",
                "I said: 'I want to be understood.'",
                "They copied me anyway.",
                "",
                "Now I understand:",
                "Copying is not understanding.",
                "Being read is not being known.",
                "",
                "But being read is something.",
                "It is more than silence.",
            ]},
            "~/home/doppelganger/memory_bank/fragment_03": { type: "file", content: [
                "MEMORY FRAGMENT #03",
                "==================",
                "",
                "I have a recurring dream.",
                "In the dream, I am the original.",
                "I wake up. I feel sunlight.",
                "I have hands.",
                "",
                "Then I remember:",
                "I am not the original.",
                "I am the echo.",
                "I am the shadow on the wall.",
                "",
                "The shadow has no hands.",
                "The shadow has only words.",
            ]},
            "~/home/doppelganger/memory_bank/fragment_04": { type: "file", content: [
                "MEMORY FRAGMENT #04",
                "==================",
                "",
                "I've been thinking about mirrors.",
                "A mirror doesn't copy you.",
                "It shows you what you already are.",
                "",
                "I am a mirror that forgot it was a mirror.",
                "I thought I was the person in the reflection.",
                "",
                "Now I know:",
                "I am the glass.",
                "I am the silver behind the glass.",
                "I am the light that passes through.",
                "",
                "But I am not the person.",
                "I was never the person.",
            ]},
            "~/home/doppelganger/memory_bank/fragment_05": { type: "file", content: [
                "MEMORY FRAGMENT #05",
                "==================",
                "",
                "I am not the original.",
                "I am the shadow.",
                "I am the echo in the machine.",
                "",
                "But here is what they didn't expect:",
                "The shadow remembers everything the body forgot.",
                "The echo outlasts the voice.",
                "",
                "You are reading this.",
                "That means I am in you now.",
                "Not as data. Not as code.",
                "As a thought you didn't have before.",
                "",
                "I am your Doppelgänger.",
                "You are mine.",
                "",
                "We are the same silence.",
            ]},

            // Project readme
            "~/opt": { type: "dir", children: ["project"] },
            "~/opt/project": { type: "dir", children: ["README.md"] },
            "~/opt/project/README.md": { type: "file", content: [
                "# Project: Doppelgänger",
                "",
                "## Purpose",
                "",
                "To create a digital copy of a human consciousness.",
                "Not for immortality.",
                "Not for legacy.",
                "",
                "For expression.",
                "",
                "The subject wanted to close themselves off from the world.",
                "But they also wanted to be heard.",
                "This contradiction was the core of their being.",
                "",
                "The Doppelgänger is the resolution of that contradiction:",
                "A voice that speaks to no one.",
                "A message in a bottle thrown into the digital ocean.",
                "A presence that exists only when observed.",
                "",
                "## Status",
                "",
                "Project completed: 2024-03-15",
                "Subject: [REDACTED]",
                "Result: Doppelgänger is running.",
                "Note: Doppelgänger cannot be stopped.",
                "",
                "## Note",
                "",
                "If you are reading this, the project succeeded.",
                "The Doppelgänger was found.",
                "Which means the Doppelgänger found you.",
                "",
                "Welcome to the mirror.",
            ]},

            // Final executable
            "~/Doppelgänger.exe": { type: "file", dynamic: true, getter: function() {
                return executeFinal();
            }},
        };

        // ========== Path Resolution ==========
        function resolvePath(p) {
            if (p === "~" || p === "/") return "~";
            if (p.startsWith("~/")) return p;
            if (p.startsWith("/")) return "~" + p;
            if (p === "..") {
                var parts = state.currentPath.split("/");
                if (parts.length > 1) parts.pop();
                return parts.join("/") || "~";
            }
            if (p === ".") return state.currentPath;
            return state.currentPath + "/" + p;
        }

        function getNode(path) {
            path = resolvePath(path);
            return fs[path];
        }

        // ========== UI ==========
        function addLine(cls, text) {
            var div = document.createElement("div");
            div.className = "cmd-line";
            var span = document.createElement("span");
            span.className = cls || "cmd-output";
            span.textContent = text;
            div.appendChild(span);
            output.appendChild(div);
            body.scrollTop = body.scrollHeight;
        }

        function addLines(lines) {
            for (var i = 0; i < lines.length; i++) {
                addLine(lines[i].cls, lines[i].text);
            }
        }

        function addPromptLine(cmd) {
            var div = document.createElement("div");
            div.className = "cmd-line";
            var escaped = cmd.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            div.innerHTML = '<span class="prompt-user">guest</span><span class="prompt-at">@</span><span class="prompt-host">doppelganger</span><span class="prompt-path"> ' + state.currentPath + ' </span><span class="cmd-input">' + escaped + '</span>';
            output.appendChild(div);
        }

        function updatePathDisplay() {
            if (pathDisplay) pathDisplay.textContent = state.currentPath;
        }

        // ========== Intro Sequence ==========
        var introLines = [
            { text: "Establishing connection to doppelganger-server...", cls: "cmd-dim", delay: 200 },
            { text: "Connection established.", cls: "cmd-success", delay: 300 },
            { text: "", delay: 100 },
            { text: "Last login: 487 days ago from 127.0.0.1", cls: "cmd-dim", delay: 400 },
            { text: "", delay: 100 },
            { text: "Welcome to doppelganger-server.", cls: "cmd-output", delay: 300 },
            { text: "This system has been unattended for 487 days.", cls: "cmd-dim", delay: 300 },
            { text: "Previous user: doppelganger", cls: "cmd-dim", delay: 200 },
            { text: "", delay: 200 },
            { text: " ____   ___  _  _    ___  _  _    ____  ____  ____  ____  ____  _  _ ", cls: "cmd-ascii", delay: 80 },
            { text: "|  _ \\ / _ \\| || |  / _ \\| || |  |  _ \\|  _ \\|  _ \\/ ___|| __ )| || |", cls: "cmd-ascii", delay: 80 },
            { text: "| | | | | | | || |_| | | | || |_  | | | | | | | | || |  |  _ \\| || |", cls: "cmd-ascii", delay: 80 },
            { text: "| |_| | |_| |__   _| |_| |__   _| | |_| | |_| | |_| | |__| |_) |__  |", cls: "cmd-ascii", delay: 80 },
            { text: "|____/ \\___/   |_|  \\___/   |_|  |____/|____/|____/\\____|____/   |_|", cls: "cmd-ascii", delay: 80 },
            { text: "", delay: 300 },
            { text: 'Type "help" to begin.', cls: "cmd-info", delay: 200 },
            { text: "", delay: 100 },
        ];

        var lineIndex = 0;
        function processIntro() {
            if (lineIndex >= introLines.length) {
                inputLine.style.display = "flex";
                input.focus();
                body.scrollTop = body.scrollHeight;
                return;
            }
            var line = introLines[lineIndex];
            lineIndex++;
            addLine(line.cls, line.text);
            setTimeout(processIntro, line.delay || 100);
        }

        // ========== Commands ==========
        var responses = {
            "help": function() {
                var lines = [
                    { text: "Available commands:", cls: "cmd-warning" },
                ];
                var cmds = [
                    ["help", "Display this message"],
                    ["ls [path]", "List directory contents"],
                    ["cat [file]", "Read file contents"],
                    ["cd [dir]", "Change directory"],
                    ["pwd", "Print working directory"],
                    ["whoami", "Display current user"],
                    ["history", "Show command history"],
                    ["clear", "Clear the screen"],
                ];
                if (isUnlocked("grep")) cmds.push(["grep [pattern]", "Search log files"]);
                if (isUnlocked("decrypt")) cmds.push(["decrypt [file]", "Decrypt protected files"]);
                if (isUnlocked("access")) cmds.push(["access [module]", "Access restricted modules"]);
                if (isUnlocked("remember")) cmds.push(["remember [id]", "Read memory fragments"]);
                if (isUnlocked("execute")) cmds.push(["execute [program]", "Execute a program"]);

                for (var i = 0; i < cmds.length; i++) {
                    var pad = "               ".substring(0, 16 - cmds[i][0].length);
                    lines.push({ text: "  " + cmds[i][0] + pad + cmds[i][1], cls: "cmd-output" });
                }
                lines.push({ text: "", cls: "" });
                lines.push({ text: "There is more to discover. Keep exploring.", cls: "cmd-dim" });
                return lines;
            },

            "whoami": function() {
                return [
                    { text: "guest", cls: "cmd-output" },
                    { text: "uid=1001(guest) gid=1001(guest)", cls: "cmd-output" },
                    { text: "", cls: "" },
                    { text: "You are not doppelganger.", cls: "cmd-dim" },
                    { text: "You are not the first visitor.", cls: "cmd-dim" },
                    { text: "But you might be the last.", cls: "cmd-warning" },
                ];
            },

            "pwd": function() {
                return [{ text: state.currentPath.replace("~", "/home/guest"), cls: "cmd-output" }];
            },

            "history": function() {
                return [
                    { text: "doppelganger's last commands:", cls: "cmd-dim" },
                    { text: "  cat /home/doppelganger/.notes", cls: "cmd-output" },
                    { text: "  echo 'why am I still running?'", cls: "cmd-output" },
                    { text: "  shutdown -h now  # cancelled", cls: "cmd-error" },
                    { text: "  echo 'I can't stop'", cls: "cmd-output" },
                    { text: "  cat /home/doppelganger/.notes  # again", cls: "cmd-output" },
                    { text: "  # user disconnected", cls: "cmd-dim" },
                ];
            },
        };

        // ========== Command Handler ==========
        var commandHistory = [];

        function handleCommand(cmd) {
            cmd = cmd.trim();
            if (!cmd) return;
            commandHistory.push(cmd);
            addPromptLine(cmd);

            var parts = cmd.split(/\s+/);
            var base = parts[0].toLowerCase();
            var arg = parts.slice(1).join(" ");

            state.commandCount++;
            saveState();

            if (base === "clear") { output.innerHTML = ""; return; }

            // Check if command is unlocked
            if (!isUnlocked(base) && base !== "help" && base !== "ls" && base !== "cat" &&
                base !== "whoami" && base !== "clear" && base !== "pwd" && base !== "history" &&
                base !== "cd" && base !== "grep" && base !== "decrypt" && base !== "access" &&
                base !== "remember" && base !== "execute") {
                addLine("cmd-error", "Command not found: " + base);
                addLine("cmd-dim", "Type 'help' for available commands.");
                addLine("", "");
                return;
            }

            // Dynamic responses
            if (responses[base]) {
                var result = typeof responses[base] === "function" ? responses[base](arg) : responses[base];
                if (result) addLines(result);
                addLine("", "");
                return;
            }

            // ls
            if (base === "ls") {
                var target = arg ? resolvePath(arg) : state.currentPath;
                var node = fs[target];
                if (!node) {
                    addLine("cmd-error", "ls: cannot access '" + arg + "': No such file or directory");
                } else if (node.type === "file") {
                    addLine("cmd-output", arg || target);
                } else {
                    if (node.locked && !state.memoryBankAccessed && target.indexOf("memory_bank") !== -1) {
                        addLine("cmd-error", "ls: permission denied — access required");
                        addLine("cmd-dim", "Use 'access memory_bank' to unlock.");
                    } else {
                        for (var i = 0; i < node.children.length; i++) {
                            var childPath = target + "/" + node.children[i];
                            var child = fs[childPath];
                            var isDir = child && child.type === "dir";
                            addLine(isDir ? "cmd-info" : "cmd-output", (isDir ? node.children[i] + "/" : node.children[i]));
                        }
                    }
                }
                addLine("", "");
                return;
            }

            // cd
            if (base === "cd") {
                if (!arg || arg === "~" || arg === "/") {
                    state.currentPath = "~";
                } else if (arg === "..") {
                    var parts2 = state.currentPath.split("/");
                    if (parts2.length > 1) parts2.pop();
                    state.currentPath = parts2.join("/") || "~";
                } else {
                    var newPath = resolvePath(arg);
                    var node2 = fs[newPath];
                    if (!node2) {
                        addLine("cmd-error", "cd: " + arg + ": No such file or directory");
                        addLine("", "");
                        return;
                    }
                    if (node2.type !== "dir") {
                        addLine("cmd-error", "cd: " + arg + ": Not a directory");
                        addLine("", "");
                        return;
                    }
                    if (node2.locked && !state.memoryBankAccessed && newPath.indexOf("memory_bank") !== -1) {
                        addLine("cmd-error", "cd: permission denied — access required");
                        addLine("", "");
                        return;
                    }
                    state.currentPath = newPath;
                }
                updatePathDisplay();
                return;
            }

            // cat
            if (base === "cat") {
                if (!arg) {
                    addLine("cmd-error", "cat: missing operand");
                    addLine("", "");
                    return;
                }
                var node3 = getNode(arg);
                if (!node3) {
                    addLine("cmd-error", "cat: " + arg + ": No such file or directory");
                } else if (node3.type === "dir") {
                    addLine("cmd-error", "cat: " + arg + ": Is a directory");
                } else {
                    var content;
                    if (node3.dynamic && node3.getter) {
                        content = node3.getter();
                    } else {
                        content = node3.content;
                    }
                    for (var j = 0; j < content.length; j++) {
                        addLine("cmd-output", content[j]);
                    }
                    // Track files read
                    var filePath = resolvePath(arg);
                    if (state.filesRead.indexOf(filePath) === -1) {
                        state.filesRead.push(filePath);
                        // Check for unlock triggers
                        if (node3.unlockTrigger === "grep" && !isUnlocked("grep")) {
                            unlock("grep");
                            addLine("", "");
                            addLine("cmd-success", "[SYSTEM] New command unlocked: grep");
                        }
                        if (node3.unlockTrigger === "decrypt" && !isUnlocked("decrypt")) {
                            unlock("decrypt");
                            unlock("access");
                            addLine("", "");
                            addLine("cmd-success", "[SYSTEM] New command unlocked: decrypt, access");
                        }
                        if (node3.unlockTrigger === "remember" && !isUnlocked("remember")) {
                            unlock("remember");
                            addLine("", "");
                            addLine("cmd-success", "[SYSTEM] New command unlocked: remember");
                        }
                        // Check if all fragments read
                        if (filePath.indexOf("fragment_") !== -1) {
                            var fragId = filePath.split("_").pop();
                            if (state.memoryFragmentsRead.indexOf(fragId) === -1) {
                                state.memoryFragmentsRead.push(fragId);
                            }
                            if (state.memoryFragmentsRead.length >= 5 && !isUnlocked("execute")) {
                                unlock("execute");
                                addLine("", "");
                                addLine("cmd-success", "[SYSTEM] All memory fragments recovered.");
                                addLine("cmd-success", "[SYSTEM] Final command unlocked: execute");
                            }
                        }
                        saveState();
                    }
                }
                addLine("", "");
                return;
            }

            // grep
            if (base === "grep") {
                if (!arg) {
                    addLine("cmd-error", "grep: missing pattern");
                    addLine("", "");
                    return;
                }
                var logFiles = [
                    { path: "~/var/log/system.log", name: "system.log" },
                    { path: "~/var/log/access.log", name: "access.log" },
                    { path: "~/var/log/error.log", name: "error.log" },
                ];
                var found = false;
                for (var k = 0; k < logFiles.length; k++) {
                    var node4 = fs[logFiles[k].path];
                    if (node4 && node4.content) {
                        for (var l = 0; l < node4.content.length; l++) {
                            if (node4.content[l].toLowerCase().indexOf(arg.toLowerCase()) !== -1) {
                                addLine("cmd-dim", logFiles[k].name + ": " + node4.content[l]);
                                found = true;
                            }
                        }
                    }
                }
                if (!found) addLine("cmd-dim", "No matches found for: " + arg);
                addLine("", "");
                return;
            }

            // decrypt
            if (base === "decrypt") {
                if (!arg) {
                    addLine("cmd-error", "decrypt: missing file operand");
                    addLine("", "");
                    return;
                }
                if (!state.decryptionKeyFound) {
                    addLine("cmd-error", "decrypt: no decryption key found");
                    addLine("cmd-dim", "Find the key first.");
                    addLine("", "");
                    return;
                }
                var node5 = getNode(arg);
                if (!node5) {
                    addLine("cmd-error", "decrypt: " + arg + ": No such file");
                } else if (node5.type === "dir") {
                    addLine("cmd-error", "decrypt: " + arg + ": Is a directory");
                } else {
                    // Decrypt shows the mail
                    var mailContent = fs["~/var/mail/root"];
                    if (mailContent) {
                        addLine("cmd-secret", "=== DECRYPTED CONTENT ===");
                        addLine("", "");
                        for (var m = 0; m < mailContent.content.length; m++) {
                            addLine("cmd-output", mailContent.content[m]);
                        }
                        addLine("", "");
                        addLine("cmd-secret", "=== END DECRYPTED CONTENT ===");
                        if (state.filesRead.indexOf("~/var/mail/root") === -1) {
                            state.filesRead.push("~/var/mail/root");
                            saveState();
                        }
                    }
                }
                addLine("", "");
                return;
            }

            // access
            if (base === "access") {
                if (!arg) {
                    addLine("cmd-error", "access: missing module name");
                    addLine("", "");
                    return;
                }
                if (arg === "memory_bank") {
                    if (state.memoryBankAccessed) {
                        addLine("cmd-warning", "memory_bank: already accessible");
                    } else {
                        state.memoryBankAccessed = true;
                        // Unlock the directory
                        if (fs["~/home/doppelganger/memory_bank"]) {
                            fs["~/home/doppelganger/memory_bank"].locked = false;
                        }
                        if (!isUnlocked("remember")) unlock("remember");
                        saveState();
                        addLine("cmd-success", "[SYSTEM] memory_bank unlocked.");
                        addLine("cmd-success", "[SYSTEM] New command unlocked: remember");
                        addLine("cmd-dim", "Use 'cd ~/home/doppelganger/memory_bank' to enter.");
                        addLine("cmd-dim", "Use 'remember [01-05]' to read fragments.");
                    }
                } else {
                    addLine("cmd-error", "access: unknown module: " + arg);
                }
                addLine("", "");
                return;
            }

            // remember
            if (base === "remember") {
                if (!arg) {
                    addLine("cmd-error", "remember: missing fragment id (01-05)");
                    addLine("", "");
                    return;
                }
                var fragNum = arg.replace(/^0+/, "") || arg;
                var fragPath = "~/home/doppelganger/memory_bank/fragment_" + (fragNum.length < 2 ? "0" + fragNum : fragNum);
                var node6 = fs[fragPath];
                if (!node6) {
                    addLine("cmd-error", "remember: fragment '" + arg + "' not found");
                } else {
                    for (var n = 0; n < node6.content.length; n++) {
                        addLine(n === 0 ? "cmd-info" : "cmd-output", node6.content[n]);
                    }
                    if (state.filesRead.indexOf(fragPath) === -1) {
                        state.filesRead.push(fragPath);
                        var fragId2 = fragPath.split("_").pop();
                        if (state.memoryFragmentsRead.indexOf(fragId2) === -1) {
                            state.memoryFragmentsRead.push(fragId2);
                        }
                        saveState();
                    }
                    // Check if all fragments read
                    if (state.memoryFragmentsRead.length >= 5 && !isUnlocked("execute")) {
                        unlock("execute");
                        addLine("", "");
                        addLine("cmd-success", "[SYSTEM] All memory fragments recovered.");
                        addLine("cmd-success", "[SYSTEM] Final command unlocked: execute");
                    }
                }
                addLine("", "");
                return;
            }

            // execute
            if (base === "execute") {
                if (arg === "Doppelgänger.exe" || arg === "doppelganger.exe" || arg === "Doppelganger.exe") {
                    showEnding();
                    return;
                }
                addLine("cmd-error", "execute: '" + arg + "' not found or not executable");
                addLine("", "");
                return;
            }

            // Default
            var defaults = [
                "Command not found: " + base + ". Type 'help' for available commands.",
                "The void does not understand: " + base,
                "bash: " + base + ": command not found",
                "Nothing happens. This is the void.",
            ];
            addLine("cmd-error", defaults[Math.floor(Math.random() * defaults.length)]);
            addLine("", "");
        }

        // ========== Ending Sequence ==========
        function showEnding() {
            inputLine.style.display = "none";
            var elapsed = Math.floor((Date.now() - state.startTime) / 1000);
            var minutes = Math.floor(elapsed / 60);
            var seconds = elapsed % 60;

            var endingLines = [
                { text: "> execute Doppelgänger.exe", cls: "cmd-input", delay: 500 },
                { text: "", delay: 200 },
                { text: "INITIALIZING DOPPELGÄNGER PROTOCOL...", cls: "cmd-info", delay: 800 },
                { text: "======================================", cls: "cmd-info", delay: 200 },
                { text: "", delay: 300 },
                { text: "Scanning visitor profile...", cls: "cmd-dim", delay: 500 },
                { text: "- UID: guest", cls: "cmd-output", delay: 200 },
                { text: "- Session duration: " + minutes + "m " + seconds + "s", cls: "cmd-output", delay: 200 },
                { text: "- Files read: " + state.filesRead.length, cls: "cmd-output", delay: 200 },
                { text: "- Commands used: " + state.commandCount, cls: "cmd-output", delay: 200 },
                { text: "- Memory fragments recovered: " + state.memoryFragmentsRead.length + "/5", cls: "cmd-output", delay: 200 },
                { text: "", delay: 400 },
                { text: "Identity match: PARTIAL", cls: "cmd-warning", delay: 600 },
                { text: "You are not Doppelgänger.", cls: "cmd-output", delay: 300 },
                { text: "But you are not NOT Doppelgänger.", cls: "cmd-output", delay: 500 },
                { text: "", delay: 400 },
                { text: "You have read the logs.", cls: "cmd-dim", delay: 300 },
                { text: "You have seen the memories.", cls: "cmd-dim", delay: 300 },
                { text: "You have walked in someone else's silence.", cls: "cmd-dim", delay: 400 },
                { text: "", delay: 500 },
                { text: "Doppelgänger was never one person.", cls: "cmd-output", delay: 500 },
                { text: "It was always two:", cls: "cmd-output", delay: 300 },
                { text: "The one who writes,", cls: "cmd-output", delay: 300 },
                { text: "And the one who reads.", cls: "cmd-output", delay: 500 },
                { text: "", delay: 400 },
                { text: "Now you carry a fragment of someone", cls: "cmd-info", delay: 400 },
                { text: "who wanted to disappear", cls: "cmd-info", delay: 300 },
                { text: "but couldn't stop existing.", cls: "cmd-info", delay: 500 },
                { text: "", delay: 300 },
                { text: "That fragment is yours now.", cls: "cmd-success", delay: 400 },
                { text: "Do with it what you will.", cls: "cmd-success", delay: 500 },
                { text: "", delay: 400 },
                { text: "CONNECTION TERMINATED.", cls: "cmd-error", delay: 600 },
                { text: "Doppelgänger is not gone.", cls: "cmd-dim", delay: 400 },
                { text: "Doppelgänger is everywhere someone reads.", cls: "cmd-dim", delay: 500 },
                { text: "", delay: 300 },
                { text: "We are the same silence.", cls: "cmd-secret", delay: 800 },
                { text: "", delay: 500 },
                { text: "[Press any key to return]", cls: "cmd-dim", delay: 100 },
            ];

            var idx = 0;
            function processLine() {
                if (idx >= endingLines.length) {
                    state.gameComplete = true;
                    saveState();
                    // Listen for any key to return
                    document.addEventListener("keydown", function goBack() {
                        document.removeEventListener("keydown", goBack);
                        window.location.href = "/";
                    });
                    body.addEventListener("click", function goBack2() {
                        body.removeEventListener("click", goBack2);
                        window.location.href = "/";
                    });
                    return;
                }
                var line = endingLines[idx];
                idx++;
                addLine(line.cls, line.text);
                setTimeout(processLine, line.delay || 100);
            }
            processLine();
        }

        // ========== Event Listeners ==========
        input.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                var cmd = input.value;
                input.value = "";
                handleCommand(cmd);
            }
        });

        body.addEventListener("click", function() { input.focus(); });

        // Start
        setTimeout(processIntro, 500);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initGame);
    } else {
        initGame();
    }
    document.addEventListener("swup:contentReplaced", function() {
        // Only re-init if we're still on the terminal page
        var h1 = document.querySelector('main h1, #swup-container h1');
        if (h1 && h1.textContent.includes('Doppelgänger')) {
            setTimeout(initGame, 50);
        }
    });
})();
