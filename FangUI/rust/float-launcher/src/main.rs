//! Copper 编译产物的启动器。
//!
//! 一个原生 Rust 小窗口：先用本地 HTTP 服务把产物目录端出来，再用 WebView2
//! 打开 `http://127.0.0.1:<端口>/`。这样页面和 `srv/*.co` 后端同源，
//! Copper 前端用 `net.post("/api/call?fn=...", 参数)` 就能调到后端函数。
//!
//! 为什么不用 C# 启动器：产物里不留第三方语言。这个 exe 是我们自己编的，
//! 只做三件事——端文件、跑 Copper 后端、开窗口。

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};

use tao::dpi::LogicalSize;
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoop};
use tao::window::WindowBuilder;
use wry::WebViewBuilder;

fn main() {
    let dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(Path::to_path_buf))
        .unwrap_or_else(|| PathBuf::from("."));

    let want = std::env::var("FLOAT_PORT")
        .ok()
        .and_then(|v| v.parse::<u16>().ok())
        .filter(|p| *p > 0)
        .unwrap_or(0);
    let port = start_server(dir.clone(), want);
    let url = format!("http://127.0.0.1:{port}/");

    let event_loop = EventLoop::new();
    let window = WindowBuilder::new()
        .with_title("Copper")
        .with_inner_size(LogicalSize::new(1100.0, 780.0))
        .with_min_inner_size(LogicalSize::new(480.0, 360.0))
        .build(&event_loop)
        .expect("窗口建不起来");

    let _webview = WebViewBuilder::new()
        .with_url(&url)
        .build(&window)
        .expect("WebView2 不可用");

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;
        if let Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
        } = event
        {
            *control_flow = ControlFlow::Exit;
        }
    });
}

/* ───────────────────────── 本地服务 ───────────────────────── */

fn start_server(root: PathBuf, want: u16) -> u16 {
    /* want > 0 用于调试/自测；正式运行传 0，让系统分配一个空闲端口 */
    let listener = match if want > 0 {
        TcpListener::bind(("127.0.0.1", want))
    } else {
        TcpListener::bind("127.0.0.1:0")
    } {
        Ok(l) => l,
        Err(_) => return 0,
    };
    let port = listener.local_addr().map(|a| a.port()).unwrap_or(0);
    std::thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let root = root.clone();
            std::thread::spawn(move || handle(stream, &root));
        }
    });
    port
}

fn handle(mut stream: TcpStream, root: &Path) {
    let mut buf = Vec::new();
    let mut tmp = [0u8; 4096];

    /* 先读请求头，直到 \r\n\r\n */
    let head_end;
    loop {
        match stream.read(&mut tmp) {
            Ok(0) => return,
            Ok(n) => {
                buf.extend_from_slice(&tmp[..n]);
                if let Some(p) = find_head_end(&buf) {
                    head_end = p;
                    break;
                }
                if buf.len() > 64 * 1024 {
                    return;
                }
            }
            Err(_) => return,
        }
    }

    let head = String::from_utf8_lossy(&buf[..head_end]).to_string();
    let mut lines = head.lines();
    let first = lines.next().unwrap_or("");
    let mut parts = first.split_whitespace();
    let _method = parts.next().unwrap_or("");
    let path = parts.next().unwrap_or("/");

    /* Content-Length：把 body 读全 */
    let mut length = 0usize;
    for line in lines {
        let lower = line.to_ascii_lowercase();
        if let Some(v) = lower.strip_prefix("content-length:") {
            length = v.trim().parse::<usize>().unwrap_or(0);
        }
    }
    let mut body = buf[head_end + 4..].to_vec();
    while body.len() < length {
        match stream.read(&mut tmp) {
            Ok(0) => break,
            Ok(n) => body.extend_from_slice(&tmp[..n]),
            Err(_) => break,
        }
    }
    let body_text = String::from_utf8_lossy(&body).to_string();

    if path.starts_with("/api/call") {
        let fname = query_value(path, "fn").unwrap_or_default();
        let out = call_copper(root, &fname, &body_text);
        respond(&mut stream, 200, "text/plain; charset=utf-8", out.as_bytes());
        return;
    }
    if path.starts_with("/api/ping") {
        respond(&mut stream, 200, "text/plain; charset=utf-8", b"ok");
        return;
    }

    /* 静态文件：/ → index.html；其余按相对路径取 */
    let rel = if path == "/" { "index.html".to_string() } else { path.trim_start_matches('/').to_string() };
    let rel = rel.split('?').next().unwrap_or("index.html").to_string();
    let file = root.join(rel.replace('/', "\\"));
    match std::fs::read(&file) {
        Ok(bytes) => {
            let mime = mime_of(&file);
            respond(&mut stream, 200, mime, &bytes);
        }
        Err(_) => respond(&mut stream, 404, "text/plain; charset=utf-8", b"not found"),
    }
}

fn find_head_end(buf: &[u8]) -> Option<usize> {
    buf.windows(4).position(|w| w == b"\r\n\r\n")
}

fn query_value(path: &str, key: &str) -> Option<String> {
    let q = path.split('?').nth(1)?;
    for pair in q.split('&') {
        let mut it = pair.splitn(2, '=');
        let k = it.next()?;
        if k == key {
            return Some(it.next().unwrap_or("").replace("%20", " "));
        }
    }
    None
}

fn mime_of(p: &Path) -> &'static str {
    match p.extension().and_then(|e| e.to_str()).unwrap_or("").to_ascii_lowercase().as_str() {
        "html" | "htm" => "text/html; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "js" => "text/javascript; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        "woff" => "font/woff",
        "ttf" => "font/ttf",
        "txt" | "co" | "cui" => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}

fn respond(stream: &mut TcpStream, code: u16, mime: &str, body: &[u8]) {
    let head = format!(
        "HTTP/1.1 {code} OK\r\nContent-Type: {mime}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
        body.len()
    );
    let _ = stream.write_all(head.as_bytes());
    let _ = stream.write_all(body);
    let _ = stream.flush();
}

/* ───────────────────────── Copper 后端 ───────────────────────── */

/// 跑 `srv/*.co` 里的一个函数，返回它的打印结果。
///
/// 每次请求都是新 VM：后端状态该存在文件/数据库里，函数之间不共享内存，
/// 这样连着点一百次也不会互相踩。
fn call_copper(root: &Path, fname: &str, arg: &str) -> String {
    if fname.is_empty() || !fname.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
        return "⚠ request 缺少合法的函数名".to_string();
    }

    let srv = root.join("srv");
    let mut src = String::new();
    if let Ok(entries) = std::fs::read_dir(&srv) {
        let mut names: Vec<String> = entries
            .flatten()
            .map(|e| e.file_name().to_string_lossy().to_string())
            .filter(|n| n.to_ascii_lowercase().ends_with(".co"))
            .collect();
        names.sort();
        for n in names {
            src.push_str(&format!("import \"srv/{n}\"\n"));
        }
    }
    if src.is_empty() {
        return "⚠ 这个产物没有 srv/*.co 后端".to_string();
    }

    let escaped = arg.replace('\\', "\\\\").replace('"', "\\\"");
    src.push_str(&format!("print({fname}(\"{escaped}\"))\n"));

    match float_lang::api::run_from("__call.co", &src, Some(root)) {
        Ok(o) => o.output.trim_end().to_string(),
        Err(e) => format!("⚠ {}（第 {} 行）", e.message, e.span.line),
    }
}
