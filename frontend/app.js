document.addEventListener("DOMContentLoaded", () => {
    // --- State ---
    let state = {
        token: localStorage.getItem("token") || null,
        role: localStorage.getItem("role") || null,
        isLoginMode: true,
        robotX: 0,
        robotY: 0,
        obstacles: [] // Could be populated if API provides map awareness
    };

    // --- DOM Elements ---
    const e = {
        authView: document.getElementById("auth-view"),
        dashboardView: document.getElementById("dashboard-view"),
        tabLogin: document.getElementById("tabLogin"),
        tabRegister: document.getElementById("tabRegister"),
        authForm: document.getElementById("auth-form"),
        roleGroup: document.getElementById("role-group"),
        usernameIn: document.getElementById("username"),
        passwordIn: document.getElementById("password"),
        roleSelect: document.getElementById("role"),
        authError: document.getElementById("auth-error"),
        btnLogout: document.getElementById("btn-logout"),
        userRoleBadge: document.getElementById("user-role-badge"),
        gridContainer: document.getElementById("grid-container"),
        btnControls: document.querySelectorAll(".dir-btn"),
        controlMsg: document.getElementById("control-msg"),
        logs: document.getElementById("audit-logs"),
        connectionBanner: document.getElementById("connection-banner"),
        // Stats
        battery: document.getElementById("stat-battery"),
        status: document.getElementById("stat-state"),
        coords: document.getElementById("stat-coords"),
        // Sensors
        sensN: document.getElementById("sens-n"),
        sensS: document.getElementById("sens-s"),
        sensE: document.getElementById("sens-e"),
        sensW: document.getElementById("sens-w"),
    };

    // --- Init ---
    initGrid();
    checkAuth();

    // --- Event Listeners ---
    document.getElementById("tab-login").addEventListener("click", () => setAuthMode(true));
    document.getElementById("tab-register").addEventListener("click", () => setAuthMode(false));
    e.authForm.addEventListener("submit", handleAuth);
    e.btnLogout.addEventListener("click", logout);
    e.btnControls.forEach(btn => btn.addEventListener("click", () => sendCommand(btn.dataset.dir)));

    // --- Functions ---
    function setAuthMode(isLogin) {
        state.isLoginMode = isLogin;
        document.getElementById("tab-login").classList.toggle("active", isLogin);
        document.getElementById("tab-register").classList.toggle("active", !isLogin);
        e.roleGroup.style.display = isLogin ? "none" : "block";
        e.authError.innerText = "";
    }

    async function handleAuth(event) {
        event.preventDefault();
        const url = state.isLoginMode ? "/api/login" : "/api/register";
        const data = state.isLoginMode
            ? new URLSearchParams({ username: e.usernameIn.value, password: e.passwordIn.value })
            : JSON.stringify({ username: e.usernameIn.value, password: e.passwordIn.value, role: e.roleSelect.value });

        const headers = state.isLoginMode
            ? { "Content-Type": "application/x-www-form-urlencoded" }
            : { "Content-Type": "application/json" };

        try {
            const res = await fetch(url, { method: "POST", headers, body: data });
            const json = await res.json();
            if (!res.ok) throw new Error(json.detail || "Authentication failed");

            if (state.isLoginMode) {
                state.token = json.access_token;
                state.role = json.role;
                localStorage.setItem("token", state.token);
                localStorage.setItem("role", state.role);
                checkAuth();
            } else {
                setAuthMode(true);
                e.authError.style.color = "var(--success)";
                e.authError.innerText = "Registration successful. Please login.";
            }
        } catch (err) {
            e.authError.style.color = "var(--danger)";
            e.authError.innerText = err.message;
        }
    }

    function checkAuth() {
        if (state.token) {
            e.authView.classList.add("hidden");
            e.dashboardView.classList.remove("hidden");
            setupDashboard();
        } else {
            e.authView.classList.remove("hidden");
            e.dashboardView.classList.add("hidden");
        }
    }

    function logout() {
        state.token = null;
        state.role = null;
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        checkAuth();
    }

    function setupDashboard() {
        e.userRoleBadge.innerText = state.role;
        e.userRoleBadge.className = `badge ${state.role === 'Commander' ? 'commander' : ''}`;

        const isCmdr = state.role === "Commander";
        e.btnControls.forEach(btn => btn.disabled = !isCmdr);
        e.controlMsg.style.display = isCmdr ? "none" : "block";

        fetchStatus();
        fetchLogs();

        // Polling loop
        if (!window.pollInterval) window.pollInterval = setInterval(fetchStatus, 1000);
        if (!window.logInterval) window.logInterval = setInterval(fetchLogs, 5000);
    }

    async function sendCommand(dir) {
        if (state.role !== "Commander") return;
        try {
            const res = await fetch(`/api/robot/move?direction=${dir}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${state.token}` }
            });
            if (!res.ok) throw new Error("Move failed");
            fetchStatus();
            fetchLogs();
        } catch (err) {
            console.error(err);
        }
    }

    async function fetchStatus() {
        try {
            const res = await fetch("/api/robot/status", {
                headers: { "Authorization": `Bearer ${state.token}` }
            });
            if (!res.ok) {
                if (res.status === 401) logout();
                throw new Error("Cannot fetch status");
            }
            const data = await res.json();
            e.connectionBanner.classList.add("hidden");

            // Assuming successful robot mock data:
            if (data.status === "success" && data.data) {
                updateVisuals(data.data);
            }
        } catch (err) {
            e.connectionBanner.classList.remove("hidden");
        }
    }

    async function fetchLogs() {
        try {
            const res = await fetch("/api/logs?limit=10", {
                headers: { "Authorization": `Bearer ${state.token}` }
            });
            if (!res.ok) return;
            const logs = await res.json();
            e.logs.innerHTML = "";
            logs.forEach(log => {
                const li = document.createElement("li");
                li.innerHTML = `<span class="log-time">${new Date(log.timestamp).toLocaleTimeString()} - ${log.username}</span>
                                <span class="log-cmd">${log.command}</span>`;
                e.logs.appendChild(li);
            });
        } catch (err) { }
    }

    function initGrid() {
        e.gridContainer.innerHTML = '';
        for (let y = 0; y <= 20; y++) {
            for (let x = 0; x <= 20; x++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.id = `cell-${x}-${y}`;
                if (x === 0 && y === 0) cell.classList.add('station'); // Charging station
                e.gridContainer.appendChild(cell);
            }
        }
    }

    function updateVisuals(data) {
        // Clear old robot pos
        const oldRobot = document.querySelector('.grid-cell.robot');
        if (oldRobot) oldRobot.classList.remove('robot');

        // Note: Robot mock API specificities not fully known, providing fallback formats
        const x = data.x !== undefined ? data.x : 0;
        const y = data.y !== undefined ? data.y : 0;

        const newRobot = document.getElementById(`cell-${x}-${y}`);
        if (newRobot) newRobot.classList.add('robot');

        state.robotX = x;
        state.robotY = y;

        // Telemetry Update
        e.coords.innerText = `(${x}, ${y})`;
        e.battery.innerText = `${data.battery !== undefined ? data.battery.toFixed(1) : 100}%`;
        if (data.battery < 20) e.battery.classList.add('low-battery'); else e.battery.classList.remove('low-battery');
        e.status.innerText = data.state || 'IDLE';

        // Sensors
        if (data.sensors) {
            e.sensN.innerText = `N: ${data.sensors.north || '--'}`;
            e.sensS.innerText = `S: ${data.sensors.south || '--'}`;
            e.sensE.innerText = `E: ${data.sensors.east || '--'}`;
            e.sensW.innerText = `W: ${data.sensors.west || '--'}`;
        }
    }
});
