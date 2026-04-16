use std::fs;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

// ── ANSI colours ──────────────────────────────────────────────────────────────
const RESET: &str = "\x1b[0m";
const BOLD: &str = "\x1b[1m";
const DIM: &str = "\x1b[2m";
const RED: &str = "\x1b[1;31m";
const GREEN: &str = "\x1b[1;32m";
const YELLOW: &str = "\x1b[1;33m";
const CYAN: &str = "\x1b[1;36m";
const WHITE: &str = "\x1b[1;37m";

macro_rules! info  { ($($a:tt)*) => { println!("{CYAN}{BOLD}[INFO]{RESET}  {}", format!($($a)*)) } }
macro_rules! ok    { ($($a:tt)*) => { println!("{GREEN}{BOLD}[ OK ]{RESET}  {}", format!($($a)*)) } }
macro_rules! warn  { ($($a:tt)*) => { println!("{YELLOW}{BOLD}[WARN]{RESET}  {}", format!($($a)*)) } }
macro_rules! fail  { ($($a:tt)*) => { eprintln!("{RED}{BOLD}[FAIL]{RESET}  {}", format!($($a)*)) } }
macro_rules! step  { ($($a:tt)*) => { println!("\n{WHITE}{BOLD}━━━ {} ━━━{RESET}", format!($($a)*)) } }
macro_rules! dim   { ($s:expr)   => { println!("{DIM}{}{RESET}", $s) } }

// ── Platform-specific npm command ─────────────────────────────────────────────
#[cfg(windows)]
const NPM: &str = "npm.cmd";
#[cfg(not(windows))]
const NPM: &str = "npm";

fn banner() {
    println!();
    println!("{CYAN}{BOLD}╔══════════════════════════════════════════════╗{RESET}");
    println!("{CYAN}{BOLD}║     Allegro AI — Network Troubleshooting     ║{RESET}");
    println!("{CYAN}{BOLD}╚══════════════════════════════════════════════╝{RESET}");
    println!();
}

fn divider() {
    dim!("────────────────────────────────────────────────");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn app_dir() -> PathBuf {
    if let Ok(p) = std::env::var("WEB_AI_APP_DIR") {
        return PathBuf::from(p);
    }
    let exe = std::env::current_exe().expect("cannot resolve executable path");
    exe.ancestors()
        .nth(4)
        .expect("unexpected directory depth")
        .join("app")
}

/// Check if a command exists on PATH (cross-platform).
fn cmd_exists(name: &str) -> bool {
    #[cfg(windows)]
    let checker = "where";
    #[cfg(not(windows))]
    let checker = "which";

    Command::new(checker)
        .arg(name)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// Run a command and capture trimmed stdout.
fn cmd_output(prog: &str, args: &[&str]) -> Option<String> {
    Command::new(prog)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
}

/// Generate a 64-char hex string (cross-platform).
fn random_hex_64() -> String {
    #[cfg(not(windows))]
    {
        let mut f = fs::File::open("/dev/urandom").expect("cannot open /dev/urandom");
        let mut buf = [0u8; 32];
        f.read_exact(&mut buf).expect("cannot read /dev/urandom");
        buf.iter().map(|b| format!("{:02x}", b)).collect()
    }
    #[cfg(windows)]
    {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        use std::time::SystemTime;

        let mut result = String::with_capacity(64);
        for i in 0..4u64 {
            let mut h = DefaultHasher::new();
            SystemTime::now().hash(&mut h);
            std::process::id().hash(&mut h);
            i.hash(&mut h);
            result.push_str(&format!("{:016x}", h.finish()));
        }
        result
    }
}

fn port_is_free(port: u16) -> bool {
    TcpListener::bind(("0.0.0.0", port)).is_ok()
}

/// Prompt user Y/n and return true if they accept (default yes).
fn ask_confirm(prompt: &str) -> bool {
    print!("{YELLOW}{BOLD}  {prompt} (Y/n): {RESET}");
    std::io::stdout().flush().unwrap_or(());
    let mut line = String::new();
    if std::io::stdin().read_line(&mut line).is_err() {
        return false;
    }
    let trimmed = line.trim().to_lowercase();
    trimmed.is_empty() || trimmed == "y" || trimmed == "yes"
}

/// Detect Linux distro from /etc/os-release.
#[cfg(not(windows))]
fn detect_linux_distro() -> &'static str {
    let Ok(content) = fs::read_to_string("/etc/os-release") else {
        return "unknown";
    };
    for line in content.lines() {
        if let Some(id) = line.strip_prefix("ID=") {
            let id = id.trim_matches('"').trim_matches('\'').to_lowercase();
            if ["ubuntu", "debian", "linuxmint", "pop"].iter().any(|d| id.contains(d)) {
                return "debian";
            }
            if ["rhel", "centos", "fedora", "rocky", "almalinux"].iter().any(|d| id.contains(d)) {
                return "rhel";
            }
        }
    }
    "unknown"
}

/// Try to install Node.js automatically. Returns true if successful.
fn install_node() -> bool {
    #[cfg(target_os = "macos")]
    {
        if cmd_exists("brew") {
            info!("รัน: brew install node");
            let status = Command::new("brew").arg("install").arg("node").status();
            return status.map(|s| s.success()).unwrap_or(false);
        }
        fail!("ไม่พบ Homebrew — ไม่สามารถติดตั้งอัตโนมัติได้");
        println!("  {DIM}ติดตั้ง Homebrew ก่อน: /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"{RESET}");
        return false;
    }
    #[cfg(all(not(target_os = "macos"), not(windows)))]
    {
        let distro = detect_linux_distro();
        match distro {
            "debian" => {
                info!("รัน nodesource setup สำหรับ Debian/Ubuntu");
                let curl = Command::new("bash")
                    .args(["-c", "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"])
                    .status();
                if !curl.map(|s| s.success()).unwrap_or(false) {
                    fail!("nodesource setup ล้มเหลว");
                    return false;
                }
                info!("รัน: sudo apt-get install -y nodejs");
                Command::new("sudo")
                    .args(["apt-get", "install", "-y", "nodejs"])
                    .status()
                    .map(|s| s.success())
                    .unwrap_or(false)
            }
            "rhel" => {
                info!("รัน nodesource setup สำหรับ RHEL/CentOS");
                let curl = Command::new("bash")
                    .args(["-c", "curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -"])
                    .status();
                if !curl.map(|s| s.success()).unwrap_or(false) {
                    fail!("nodesource setup ล้มเหลว");
                    return false;
                }
                info!("รัน: sudo yum install -y nodejs");
                Command::new("sudo")
                    .args(["yum", "install", "-y", "nodejs"])
                    .status()
                    .map(|s| s.success())
                    .unwrap_or(false)
            }
            _ => {
                fail!("ไม่รู้จัก distro — ไม่สามารถติดตั้งอัตโนมัติได้");
                println!("  {DIM}ดาวน์โหลด Node.js จาก https://nodejs.org/en/download{RESET}");
                false
            }
        }
    }
    #[cfg(windows)]
    {
        if cmd_exists("winget") {
            info!("รัน: winget install OpenJS.NodeJS.LTS --silent");
            Command::new("winget")
                .args(["install", "OpenJS.NodeJS.LTS", "--silent", "--accept-package-agreements", "--accept-source-agreements"])
                .status()
                .map(|s| s.success())
                .unwrap_or(false)
        } else {
            fail!("ไม่พบ winget — ดาวน์โหลด Node.js จาก https://nodejs.org");
            false
        }
    }
}

/// Try to install build tools automatically. Returns true if successful.
fn install_build_tools() -> bool {
    #[cfg(target_os = "macos")]
    {
        info!("รัน: xcode-select --install");
        warn!("คำสั่งนี้อาจเปิด dialog ให้กด Install");
        Command::new("xcode-select")
            .arg("--install")
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }
    #[cfg(all(not(target_os = "macos"), not(windows)))]
    {
        let distro = detect_linux_distro();
        match distro {
            "debian" => {
                info!("รัน: sudo apt-get install -y build-essential python3");
                Command::new("sudo")
                    .args(["apt-get", "install", "-y", "build-essential", "python3"])
                    .status()
                    .map(|s| s.success())
                    .unwrap_or(false)
            }
            "rhel" => {
                info!("รัน: sudo yum groupinstall + python3");
                let s1 = Command::new("sudo")
                    .args(["yum", "groupinstall", "-y", "Development Tools"])
                    .status()
                    .map(|s| s.success())
                    .unwrap_or(false);
                let s2 = Command::new("sudo")
                    .args(["yum", "install", "-y", "python3"])
                    .status()
                    .map(|s| s.success())
                    .unwrap_or(false);
                s1 && s2
            }
            _ => {
                fail!("ไม่รู้จัก distro — ไม่สามารถติดตั้งอัตโนมัติได้");
                false
            }
        }
    }
    #[cfg(windows)]
    {
        if cmd_exists("winget") {
            info!("รัน: winget install Microsoft.VisualStudio.2022.BuildTools");
            Command::new("winget")
                .args(["install", "Microsoft.VisualStudio.2022.BuildTools", "--silent",
                       "--accept-package-agreements", "--accept-source-agreements"])
                .status()
                .map(|s| s.success())
                .unwrap_or(false)
        } else {
            fail!("ไม่พบ winget");
            false
        }
    }
}

// ── Steps ─────────────────────────────────────────────────────────────────────

fn check_node() {
    step!("Checking Node.js");
    let ver = cmd_output("node", &["--version"]);

    if ver.is_none() {
        fail!("Node.js ไม่พบในระบบ");
        println!();

        #[cfg(target_os = "macos")]
        println!("  {YELLOW}จะรัน:{RESET} brew install node");
        #[cfg(all(not(target_os = "macos"), not(windows)))]
        println!("  {YELLOW}จะรัน:{RESET} nodesource setup + apt/yum install nodejs");
        #[cfg(windows)]
        println!("  {YELLOW}จะรัน:{RESET} winget install OpenJS.NodeJS.LTS");
        println!();

        if !ask_confirm("ต้องการให้ติดตั้ง Node.js อัตโนมัติไหม?") {
            println!();
            info!("ข้ามการติดตั้ง — กรุณาติดตั้ง Node.js v18+ เองแล้วรัน start ใหม่");
            std::process::exit(1);
        }

        println!();
        if !install_node() {
            fail!("ติดตั้ง Node.js ไม่สำเร็จ");
            std::process::exit(1);
        }

        // Re-check after install
        let ver_after = cmd_output("node", &["--version"]);
        if ver_after.is_none() {
            warn!("Node.js ถูกติดตั้งแล้ว แต่ยังไม่พบในระบบ");
            warn!("อาจต้อง restart terminal แล้วรัน start ใหม่");
            std::process::exit(1);
        }

        let ver = ver_after.unwrap();
        let major: u32 = ver.trim_start_matches('v').split('.').next()
            .and_then(|s| s.parse().ok()).unwrap_or(0);
        if major < 18 {
            fail!("Node.js {ver} เก่าเกินไป — ต้องการ v18+");
            std::process::exit(1);
        }
        ok!("Node.js {ver} ติดตั้งเรียบร้อย");
        return;
    }

    let ver = ver.unwrap();
    let major: u32 = ver
        .trim_start_matches('v')
        .split('.')
        .next()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    if major < 18 {
        fail!("Node.js {ver} เก่าเกินไป — ต้องการ v18+");
        std::process::exit(1);
    }
    ok!("Node.js {ver} (>= v18 ✓)");
}

fn check_npm() {
    step!("Checking npm");
    let Some(ver) = cmd_output(NPM, &["--version"]) else {
        fail!("npm ไม่พบในระบบ — ลองติดตั้ง Node.js ใหม่จาก https://nodejs.org");
        std::process::exit(1);
    };
    ok!("npm {ver}");
}

fn check_build_tools() {
    step!("Checking C/C++ build tools (สำหรับ better-sqlite3)");

    #[cfg(windows)]
    {
        let has_cl = cmd_exists("cl.exe") || cmd_exists("cl");
        let has_gcc = cmd_exists("gcc");
        if !has_cl && !has_gcc {
            warn!("ไม่พบ C/C++ compiler (cl.exe หรือ gcc)");
            println!("  {YELLOW}จะรัน:{RESET} winget install Microsoft.VisualStudio.2022.BuildTools");
            println!();
            if ask_confirm("ต้องการให้ติดตั้ง Visual Studio Build Tools อัตโนมัติไหม?") {
                if install_build_tools() {
                    ok!("ติดตั้ง Build Tools เรียบร้อย (อาจต้อง restart terminal)");
                } else {
                    warn!("ติดตั้งไม่สำเร็จ — ดำเนินการต่อ แต่ npm install อาจล้มเหลว");
                }
            } else {
                warn!("ข้ามการติดตั้ง — npm install อาจล้มเหลวถ้าขาด build tools");
            }
        } else {
            ok!("C/C++ compiler พร้อมใช้งาน");
        }
    }
    #[cfg(not(windows))]
    {
        let tools = ["gcc", "g++", "make"];
        let python = ["python3", "python"];
        let missing: Vec<&str> = tools.iter().copied().filter(|t| !cmd_exists(t)).collect();
        let has_python = python.iter().any(|p| cmd_exists(p));

        if !missing.is_empty() || !has_python {
            let mut all_missing = missing.clone();
            if !has_python { all_missing.push("python3"); }
            warn!("ไม่พบ build tools: {}", all_missing.join(", "));

            #[cfg(target_os = "macos")]
            println!("  {YELLOW}จะรัน:{RESET} xcode-select --install");
            #[cfg(not(target_os = "macos"))]
            {
                let distro = detect_linux_distro();
                match distro {
                    "debian" => println!("  {YELLOW}จะรัน:{RESET} sudo apt-get install -y build-essential python3"),
                    "rhel"   => println!("  {YELLOW}จะรัน:{RESET} sudo yum groupinstall -y 'Development Tools' && sudo yum install -y python3"),
                    _        => println!("  {DIM}ติดตั้ง gcc, g++, make, python3 ด้วยตัวเอง{RESET}"),
                }
            }
            println!();

            if ask_confirm("ต้องการให้ติดตั้ง build tools อัตโนมัติไหม?") {
                if install_build_tools() {
                    ok!("ติดตั้ง build tools เรียบร้อย");
                } else {
                    warn!("ติดตั้งไม่สำเร็จ — ดำเนินการต่อ แต่ npm install อาจล้มเหลว");
                }
            } else {
                warn!("ข้ามการติดตั้ง — npm install อาจล้มเหลวถ้าขาด build tools");
            }
        } else {
            ok!("gcc, g++, make, python พร้อมใช้งาน");
        }
    }
}

fn npm_install(app: &Path) {
    step!("Installing dependencies (npm install)");
    info!("Working directory: {}", app.display());
    println!();

    let status = Command::new(NPM)
        .arg("install")
        .current_dir(app)
        .status()
        .unwrap_or_else(|e| {
            fail!("ไม่สามารถรัน npm: {e}");
            std::process::exit(1);
        });

    if !status.success() {
        println!();
        fail!("npm install ล้มเหลว");
        println!();
        println!("  {YELLOW}สาเหตุที่พบบ่อย:{RESET}");
        println!("  1. ขาด build tools — ดู Step ด้านบน");
        println!("  2. Node.js version ไม่ตรง");
        println!("  3. ปัญหา network — ลอง: npm install --prefer-offline");
        println!();
        std::process::exit(1);
    }

    println!();
    ok!("Dependencies ติดตั้งเรียบร้อย");
}

fn ensure_env(app: &Path) {
    step!("Environment file (.env.local)");
    let env_path = app.join(".env.local");

    if env_path.exists() {
        ok!(".env.local มีอยู่แล้ว — ข้ามขั้นตอนนี้");
        return;
    }

    info!("สร้าง .env.local ...");
    let secret = random_hex_64();

    let content = format!(
        "# ─────────────────────────────────────────────────────────────────────────────\n\
         # .env.local — สร้างอัตโนมัติโดย start binary\n\
         # แก้ไขได้ ไฟล์นี้จะไม่ถูกสร้างใหม่เมื่อรัน start อีกครั้ง\n\
         # ─────────────────────────────────────────────────────────────────────────────\n\
         \n\
         # Gemini API Key — รับจาก https://aistudio.google.com\n\
         GEMINI_API_KEY=\n\
         \n\
         # NextAuth secret (ไม่ได้ใช้ login แต่ Next.js ต้องการ)\n\
         NEXTAUTH_SECRET={secret}\n"
    );

    fs::write(&env_path, &content).unwrap_or_else(|e| {
        warn!("ไม่สามารถสร้าง .env.local: {e}");
    });

    ok!(".env.local สร้างเรียบร้อย: {}", env_path.display());
    warn!("กรุณาใส่ GEMINI_API_KEY ใน .env.local หรือตั้งค่าใน Settings ในแอป");
}

fn check_port(port: u16) {
    step!("Checking port {port}");
    if port_is_free(port) {
        ok!("Port {port} ว่าง");
    } else {
        warn!("Port {port} ถูกใช้งานอยู่");
        #[cfg(not(windows))]
        {
            println!("  {YELLOW}ปลด port ด้วย:{RESET}");
            println!("  {DIM}  fuser -k {port}/tcp{RESET}");
            println!("  {DIM}  kill $(lsof -t -i:{port}){RESET}");
        }
        #[cfg(windows)]
        {
            println!("  {YELLOW}ค้นหา process ที่ใช้ port:{RESET}");
            println!("  {DIM}  netstat -ano | findstr :{port}{RESET}");
            println!("  {DIM}  taskkill /PID <PID> /F{RESET}");
        }
    }
}

fn print_summary(app: &Path, port: u16) {
    divider();
    println!();
    println!("{GREEN}{BOLD}  พร้อมแล้ว! กำลังเริ่ม dev server...{RESET}");
    println!();
    println!("  {WHITE}Project :{RESET} {}", app.display());
    println!("  {WHITE}Command :{RESET} npm run dev");
    println!("  {WHITE}URL     :{RESET} {CYAN}{BOLD}http://localhost:{port}{RESET}");
    println!();
    println!("  {DIM}กด Ctrl+C เพื่อหยุด server{RESET}");
    println!();
    divider();
    println!();
}

// ── Platform-specific exec ────────────────────────────────────────────────────

/// On Unix: replace current process with npm run dev (Ctrl+C goes to npm directly).
/// On Windows: spawn npm and wait — process replacement isn't available.
#[cfg(not(windows))]
fn exec_npm(app: &Path) -> ! {
    use std::os::unix::process::CommandExt;
    let err = Command::new(NPM)
        .args(["run", "dev"])
        .current_dir(app)
        .exec();
    fail!("ไม่สามารถ exec npm: {err}");
    std::process::exit(1);
}

#[cfg(windows)]
fn exec_npm(app: &Path) -> ! {
    let status = Command::new(NPM)
        .args(["run", "dev"])
        .current_dir(app)
        .status()
        .unwrap_or_else(|e| {
            fail!("ไม่สามารถรัน npm: {e}");
            std::process::exit(1);
        });
    std::process::exit(status.code().unwrap_or(1));
}

// ── Entry point ───────────────────────────────────────────────────────────────

fn main() {
    banner();

    let app = app_dir();

    if !app.exists() {
        fail!("ไม่พบโฟลเดอร์ app/: {}", app.display());
        println!("  กรุณาวาง binary ไว้ใน start-rs/target/release/ หรือตั้ง WEB_AI_APP_DIR=<path>");
        std::process::exit(1);
    }

    check_node();
    check_npm();
    check_build_tools();
    npm_install(&app);
    ensure_env(&app);
    check_port(3000);
    print_summary(&app, 3000);

    exec_npm(&app);
}
