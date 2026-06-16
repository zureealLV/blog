/* 404 Terminal - loaded only on pages that include this script */
(function() {
    function initTerminal() {
    // Page guard: only run on 404 pages. Check the h1 header since it's
    // already in the DOM when ScriptsPlugin re-executes this script.
    var h1 = document.querySelector('main h1, #swup-container h1');
    if (!h1 || !h1.textContent.includes('404')) return;

    var output = document.getElementById("terminal-output");
    var inputLine = document.getElementById("input-line");
    var input = document.getElementById("terminal-input");
    var body = document.getElementById("terminal-body");
    if (!output || !input || !inputLine) return;

    // Prevent double-init
    if (output.dataset.init === "done") return;
    output.dataset.init = "done";

    // Clear previous state
    output.innerHTML = "";
    inputLine.style.display = "none";
    input.value = "";

    // ========== Loading Sequence ==========
    var introLines = [
        { text: "Last login: " + new Date().toLocaleString() + " on ttys000", cls: "cmd-dim", delay: 100 },
        { text: "", delay: 50 },
        { text: "zureeal@osu-tv ~ $ curl -s https://zureeallv.com" + location.pathname, cls: "cmd-input", delay: 600 },
        { text: "", delay: 200 },
        { text: "> Connecting to zureeallv.com...", cls: "cmd-dim", delay: 400 },
        { text: "> HTTP/1.1 404 Not Found", cls: "cmd-error", delay: 300 },
        { text: "> Content-Type: text/html; charset=utf-8", cls: "cmd-dim", delay: 200 },
        { text: "> X-Powered-By: Astro + Firefly", cls: "cmd-dim", delay: 150 },
        { text: "", delay: 100 },
        { text: "ERROR: Page not found in this universe.", cls: "cmd-error", delay: 400 },
        { text: "", delay: 100 },
        { text: "Possible causes:", cls: "cmd-warning", delay: 300 },
        { text: "  - The page was eaten by a osu! slider", cls: "cmd-output", delay: 200 },
        { text: "  - It eloped with a 403 Forbidden", cls: "cmd-output", delay: 200 },
        { text: "  - Hermes accidentally deleted it (blame the AI)", cls: "cmd-output", delay: 200 },
        { text: "  - You typed the URL while playing DT", cls: "cmd-output", delay: 200 },
        { text: "", delay: 150 },
        { text: " ____   ___  _  _    ___  _  _\n|___ \\ / _ \\| || |  / _ \\/ |___ \\ \n  __) | | | | || |_| | | | | __) |\n / __/| |_| |__   _| |_| | |/ __/\n|_____|\\___/   |_|  \\___/|_|_____|", cls: "cmd-ascii", delay: 400 },
        { text: "", delay: 200 },
        { text: "zureeal@osu-tv ~ $ echo \"where am i?\"", cls: "cmd-input", delay: 500 },
        { text: "The void. You are in the void.", cls: "cmd-output", delay: 300 },
        { text: "", delay: 100 },
        { text: "zureeal@osu-tv ~ $ man osu", cls: "cmd-input", delay: 500 },
        { text: "No manual entry for osu. Just play more.", cls: "cmd-output", delay: 400 },
        { text: "", delay: 100 },
        { text: 'Type "help" for available commands.', cls: "cmd-info", delay: 300 },
        { text: "", delay: 100 },
    ];

    // ========== Command Responses ==========
    var responses = {
        "help": [
            { text: "Available commands:", cls: "cmd-warning" },
            { text: "  help     - You just used it. Congratulations.", cls: "cmd-output" },
            { text: "  home     - Escape the void (coward)", cls: "cmd-output" },
            { text: "  about    - Who is this zureeal person?", cls: "cmd-output" },
            { text: "  osu      - osu! related nonsense", cls: "cmd-output" },
            { text: "  404      - Echo chamber", cls: "cmd-output" },
            { text: "  sudo     - Nice try", cls: "cmd-output" },
            { text: "  exit     - You can't leave", cls: "cmd-output" },
            { text: "  clear    - Clear the screen", cls: "cmd-output" },
        ],
        "home": "redirect",
        "about": [
            { text: "Name: zureealLV", cls: "cmd-output" },
            { text: "Title: osu! player / poet / cyber psycho", cls: "cmd-output" },
            { text: "Status: Probably playing osu! right now", cls: "cmd-output" },
            { text: "Motto: 感谢你的庇佑🙏", cls: "cmd-info" },
        ],
        "osu": [
            { text: "  ___  ", cls: "cmd-ascii" },
            { text: " / _ \\ ", cls: "cmd-ascii" },
            { text: "| (_) |", cls: "cmd-ascii" },
            { text: " \\___/ ", cls: "cmd-ascii" },
            { text: "", cls: "cmd-output" },
            { text: "PP: 4,702 | Rank: #125,845 | Just play more.", cls: "cmd-info" },
        ],
        "404": [
            { text: "404 Not Found", cls: "cmd-error" },
            { text: "404 Not Found", cls: "cmd-error" },
            { text: "404 Not Found", cls: "cmd-error" },
            { text: "Yes, you're still here.", cls: "cmd-dim" },
        ],
        "sudo": [
            { text: "[sudo] password for zureeal: ********", cls: "cmd-output" },
            { text: "Nice try. This isn't that kind of server.", cls: "cmd-error" },
            { text: "Also, you're on a 404 page. What did you expect?", cls: "cmd-dim" },
        ],
        "exit": [
            { text: "logout", cls: "cmd-output" },
            { text: "Connection to osu-tv closed.", cls: "cmd-dim" },
            { text: "Just kidding. You can never leave.", cls: "cmd-error" },
            { text: "This is the void. The void is forever.", cls: "cmd-dim" },
        ],
        "clear": "clear",
        "ls": [{ text: "404.html  void.txt  regrets.log  osu-scores.csv", cls: "cmd-output" }],
        "pwd": [{ text: "/dev/null", cls: "cmd-output" }],
        "whoami": [{ text: "You are lost.", cls: "cmd-error" }],
        "cat": [
            { text: "Meow. 🐱", cls: "cmd-output" },
            { text: "Wait, you meant cat(1)? Too bad.", cls: "cmd-dim" },
        ],
        "rm": [
            { text: "rm: cannot remove '404': Permission denied", cls: "cmd-error" },
            { text: "Nice try though.", cls: "cmd-dim" },
        ],
        "cd": [{ text: "There is nowhere to go. You are in the void.", cls: "cmd-error" }],
        "ping": [
            { text: "PING void (0.0.0.0): 56 data bytes", cls: "cmd-output" },
            { text: "Request timeout for icmp_seq 0", cls: "cmd-error" },
            { text: "Request timeout for icmp_seq 1", cls: "cmd-error" },
            { text: "The void does not respond.", cls: "cmd-dim" },
        ],
        "curl": [{ text: "curl: (6) Could not resolve host: this-page-does-not-exist", cls: "cmd-error" }],
        "neofetch": [
            { text: "    OS: Void Linux x86_64", cls: "cmd-output" },
            { text: "  Host: zureealLV's blog", cls: "cmd-output" },
            { text: "Kernel: 404.0-NOT-FOUND", cls: "cmd-output" },
            { text: "  Shell: void-sh 0.0.0", cls: "cmd-output" },
            { text: "  Theme: Cyber Depressed", cls: "cmd-info" },
            { text: "  Music: タイムパラドックス", cls: "cmd-info" },
        ],
        "matrix": "matrix",
        "fortune": "fortune",
        "vim": [
            { text: "~", cls: "cmd-dim" },
            { text: "~", cls: "cmd-dim" },
            { text: "~                              VIM - Vi IMproved", cls: "cmd-info" },
            { text: "", cls: "cmd-output" },
            { text: "You opened vim on a 404 page.", cls: "cmd-warning" },
            { text: "You cannot exit vim.", cls: "cmd-error" },
            { text: "Nobody can exit vim.", cls: "cmd-error" },
            { text: "vim exits you.", cls: "cmd-dim" },
            { text: "", cls: "cmd-output" },
            { text: "(:q! does not work here)", cls: "cmd-dim" },
        ],
        "play": "play",
        "date": "date",
        "echo": "echo",
    };

    // ========== Bilingual Default Responses ==========
    var defaultResponses = [
        // English
        [{ text: "404: Command not found. Just like this page.", cls: "cmd-error" }],
        [{ text: 'Unknown command. Type "help" if you\'re lost.', cls: "cmd-warning" }],
        [{ text: "bash: $CMD$: command not found", cls: "cmd-error" }, { text: "Everything is 404 here. Even your commands.", cls: "cmd-dim" }],
        [{ text: "The void does not understand: $CMD$", cls: "cmd-error" }],
        [{ text: "You typed '$CMD$' into a 404 page. Think about your life choices.", cls: "cmd-error" }],
        [{ text: "Command '$CMD$' not found. Neither is this page.", cls: "cmd-dim" }],
        // Chinese
        [{ text: "404：命令未找到，就像这个页面一样不存在。", cls: "cmd-error" }],
        [{ text: "你在 404 页面敲命令？你是不是 osu! 打多了脑子瓦特了？", cls: "cmd-warning" }],
        [{ text: "bash: $CMD$: 未找到命令。你迷路了，亲。", cls: "cmd-error" }],
        [{ text: "虚空听不懂你说什么：$CMD$", cls: "cmd-error" }],
        [{ text: "这个页面和你的 osu! 排名一样——不存在。", cls: "cmd-dim" }],
        [{ text: "你输入了 '$CMD$'。勇敢，但没用。", cls: "cmd-error" }],
        [{ text: "404 Not Found。你打的命令也是 404。双重 404，恭喜。", cls: "cmd-error" }],
        [{ text: "别敲了，这里什么都没有。就像你的 SS 数量一样。", cls: "cmd-dim" }],
        [{ text: "Error: 找不到命令 '$CMD$'，也找不到这个页面，也找不到你的人生方向。", cls: "cmd-error" }],
        [{ text: "你在虚空里打字，没人会回应你。就像你给 crush 发的消息。", cls: "cmd-warning" }],
    ];

    // ========== Engine ==========
    var lineIndex = 0;
    var defaultIndex = 0;

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

    function addPromptLine(cmd) {
        var div = document.createElement("div");
        div.className = "cmd-line";
        var escaped = cmd.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        div.innerHTML = '<span class="prompt-user">zureeal</span><span class="prompt-at">@</span><span class="prompt-host">osu-tv</span><span class="prompt-path"> ~ $ </span><span class="cmd-input">' + escaped + '</span>';
        output.appendChild(div);
    }

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

    function handleCommand(cmd) {
        cmd = cmd.trim().toLowerCase();
        if (!cmd) return;
        addPromptLine(cmd);

        if (cmd === "clear") { output.innerHTML = ""; return; }

        if (cmd === "home" || cmd === "cd /" || cmd === "cd ~") {
            addLine("cmd-success", "Redirecting to homepage...");
            setTimeout(function() { window.location.href = "/"; }, 800);
            return;
        }

        var resp = responses[cmd];
        if (resp === "redirect") {
            addLine("cmd-success", "Redirecting to homepage...");
            setTimeout(function() { window.location.href = "/"; }, 800);
            return;
        }

        if (resp && resp.length) {
            for (var i = 0; i < resp.length; i++) {
                addLine(resp[i].cls, resp[i].text);
            }
        } else {
            // Random bilingual response
            var chosen = defaultResponses[defaultIndex % defaultResponses.length];
            defaultIndex++;
            for (var j = 0; j < chosen.length; j++) {
                var text = chosen[j].text.replace(/\$CMD\$/g, cmd);
                addLine(chosen[j].cls, text);
            }
        }

        addLine("", "");
        body.scrollTop = body.scrollHeight;
    }

    // ========== Fortune Quotes ==========
    var fortunes = [
        "重复是最不原创的行为，但坚持重复本身，却成了一种独特的存在方式。",
        "意识到自己是一具皮象的真理，一种由感官拼凑，由记忆驱动的肉质机器。",
        "创伤的语言是无意识的沟壑，组成神经元的构型。",
        "当你持续凝视一个物体，附着于其的表象就开始裂解。",
        "我们在振荡中往复，没人能逃出自身的沟壑。",
        "我有些时候因为异质的痛苦而清醒，这种痛苦驱使我写作。",
        "在一片吵闹的雨夜中给你写信。",
        "月光只是单纯的照着。",
        "流亡意味着短暂的窃取一段生活。",
        "雨声是我的旧录音带。",
        "重复是一种温柔的暴力。",
        "你好，这里是虚空。这里什么都没有，但你还是来了。",
    ];

    function showFortune() {
        var q = fortunes[Math.floor(Math.random() * fortunes.length)];
        addLine("cmd-info", "  " + q);
        addLine("cmd-dim", "  —— from the void");
    }

    // ========== Matrix Rain ==========
    function showMatrix() {
        var canvas = document.createElement("canvas");
        canvas.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:9999;background:#000";
        document.body.appendChild(canvas);
        var ctx = canvas.getContext("2d");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        var cols = Math.floor(canvas.width / 14);
        var drops = [];
        for (var i = 0; i < cols; i++) drops[i] = 1;
        var chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";
        var frame = 0;
        var maxFrames = 300;
        function draw() {
            ctx.fillStyle = "rgba(0,0,0,0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#0f0";
            ctx.font = "14px monospace";
            for (var i = 0; i < drops.length; i++) {
                var text = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillStyle = Math.random() > 0.98 ? "#fff" : "#0f0";
                ctx.fillText(text, i * 14, drops[i] * 14);
                if (drops[i] * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
                drops[i]++;
            }
            frame++;
            if (frame < maxFrames) requestAnimationFrame(draw);
            else canvas.remove();
        }
        draw();
    }

    // ========== Command Handler Extension ==========
    var originalHandleCommand = handleCommand;
    handleCommand = function(cmd) {
        cmd = cmd.trim().toLowerCase();
        if (!cmd) return;
        addPromptLine(cmd);

        if (cmd === "clear") { output.innerHTML = ""; return; }
        if (cmd === "matrix") { showMatrix(); return; }
        if (cmd === "fortune") { showFortune(); addLine("", ""); body.scrollTop = body.scrollHeight; return; }
        if (cmd === "play") {
            addLine("cmd-success", "Initializing Doppelgänger protocol...");
            addLine("cmd-dim", "Connecting to server...");
            setTimeout(function() { window.location.href = "/terminal"; }, 1200);
            return;
        }
        if (cmd === "date") {
            var now = new Date();
            addLine("cmd-output", now.toString());
            var quotes = [
                "Time is a flat circle. —— Nietzsche",
                "The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion. —— Camus",
                "We are all just walking each other home. —— Ram Dass",
                "I think therefore I am? Prove it. —— The Void",
            ];
            addLine("cmd-dim", "  " + quotes[Math.floor(Math.random() * quotes.length)]);
            addLine("", "");
            body.scrollTop = body.scrollHeight;
            return;
        }
        if (cmd.startsWith("echo ")) {
            var text = cmd.substring(5);
            var tamper = Math.random() > 0.7;
            if (tamper) {
                var glitches = ["[REDACTED]", "...", "void", "404", "█".repeat(text.length), text.split("").reverse().join(""), "who are you?"];
                addLine("cmd-error", glitches[Math.floor(Math.random() * glitches.length)]);
                addLine("cmd-dim", "(The void has its own opinions.)");
            } else {
                addLine("cmd-output", text);
            }
            addLine("", "");
            body.scrollTop = body.scrollHeight;
            return;
        }
        if (cmd === "echo") {
            addLine("cmd-warning", "echo: what do you want to say?");
            addLine("", "");
            body.scrollTop = body.scrollHeight;
            return;
        }

        // fallback to original
        originalHandleCommand(cmd);
    };

    input.addEventListener("keydown", function(e) {
        if (e.key === "Enter") {
            var cmd = input.value;
            input.value = "";
            handleCommand(cmd);
        }
    });

    body.addEventListener("click", function() { input.focus(); });

    setTimeout(processIntro, 500);
    } // end initTerminal

    // Run immediately if DOM ready, else wait
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initTerminal);
    } else {
        initTerminal();
    }

    // Re-init on Swup page navigation (SPA transitions)
    // CRITICAL: check we're still on the 404 page, otherwise this listener
    // fires on OTHER pages (like /terminal/) and overwrites their content
    document.addEventListener("swup:contentReplaced", function() {
        // Only re-init if current page is still a 404 page
        var h1 = document.querySelector('main h1, #swup-container h1');
        if (h1 && h1.textContent.includes('404')) {
            output.dataset.init = ""; // reset guard so initTerminal runs fresh
            setTimeout(initTerminal, 50);
        }
    });
})();
