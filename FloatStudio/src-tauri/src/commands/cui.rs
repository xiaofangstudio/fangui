//! Copper UI 编译命令：把 .cui 的编译交给 Rust 内核。
//!
//! 之前预览面板用的是前端 TS 实现（`src/cui/`），两份逻辑容易走偏。
//! 这里把 Rust 版接出来，IDE 在 Tauri 里运行时优先走它；
//! 浏览器里没有内核时才回退到 TS 版。

use serde::Serialize;

#[derive(Serialize)]
pub struct CuiDiagDto {
    pub line: u32,
    pub col: u32,
    pub level: String,
    pub msg: String,
}

#[derive(Serialize)]
pub struct CuiTextDto {
    pub sel: String,
    pub text: String,
}

#[derive(Serialize)]
pub struct CuiImgDto {
    pub sel: String,
    pub src: String,
}

#[derive(Serialize)]
pub struct CuiCompileDto {
    pub css: String,
    pub diags: Vec<CuiDiagDto>,
    pub texts: Vec<CuiTextDto>,
    pub imgs: Vec<CuiImgDto>,
    pub decl_count: u32,
    pub rule_count: u32,
}

/// 编译一段 .cui 源码。永不失败——最坏情况是返回空 CSS 加一堆诊断。
#[tauri::command]
pub fn cui_compile(source: String) -> CuiCompileDto {
    let r = float_lang::cui::compile(&source);
    CuiCompileDto {
        css: r.css,
        diags: r
            .diags
            .into_iter()
            .map(|d| CuiDiagDto {
                line: d.line as u32,
                col: d.col as u32,
                level: if d.level == float_lang::cui::Level::Error { "error".into() } else { "warn".into() },
                msg: d.msg,
            })
            .collect(),
        texts: r.texts.into_iter().map(|t| CuiTextDto { sel: t.sel, text: t.text }).collect(),
        imgs: r.imgs.into_iter().map(|i| CuiImgDto { sel: i.sel, src: i.src }).collect(),
        decl_count: r.decl_count as u32,
        rule_count: r.rule_count as u32,
    }
}

/// 只查语法：给保存前校验 / AOT 预检用。
#[tauri::command]
pub fn cui_check(source: String) -> Vec<CuiDiagDto> {
    float_lang::cui::check(&source)
        .into_iter()
        .map(|d| CuiDiagDto {
            line: d.line as u32,
            col: d.col as u32,
            level: if d.level == float_lang::cui::Level::Error { "error".into() } else { "warn".into() },
            msg: d.msg,
        })
        .collect()
}
