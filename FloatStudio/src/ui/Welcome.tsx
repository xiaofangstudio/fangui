import React, { useEffect, useMemo, useState } from 'react';
import { TUTORIAL_STATS } from '../docs/tutorial';
import { api } from '../core/tauri';
import { Runner } from '../lang/interp';
import { TutorialPage } from '../docs/TutorialPage';
import { TEMPLATES, KIND_LABEL, KIND_ORDER, type Template } from '../core/templates';
import { Logo, IconFolder, IconFile, IconPlus, IconImport, IconClose, IconBook, IconImage, IconSearch } from './icons';
import { TitleBar } from './TitleBar';
import { MenuBar, type MenuGroup } from './MenuBar';
import { ShortcutsDialog } from './ShortcutsDialog';
import { SettingsDialog } from './SettingsDialog';
import { AppearanceDialog } from './AppearanceDialog';
import type { RecentItem } from '../core/types';

/* 欢迎页（对标 PyCharm 新 UI）：左边是项目列表，右边是居中大标题与操作卡片。 */

function TplThumb({ tpl, active }: { tpl: Template; active: boolean }) {
  const line = active ? '#7cffb9' : '#3f9e6b';
  const soft = active ? '#cfffe5' : '#72ad8e';
  if (tpl.id === 'class') return (
    <svg width="150" height="80" viewBox="0 0 150 80">
      <rect x="10" y="16" width="46" height="46" rx="5" fill="none" stroke={line} strokeWidth="1.6" />
      <text x="33" y="44" fontSize={11} fill={soft} textAnchor="middle" fontFamily="Consolas, monospace">class</text>
      <rect x="70" y="16" width="46" height="46" rx="5" fill="none" stroke={line} strokeWidth="1.6" strokeDasharray="3 3" />
      <text x="93" y="44" fontSize={11} fill={line} textAnchor="middle" fontFamily="Consolas, monospace">extends</text>
      <path d="M132 24v28M126 28l6-6 6 6" stroke={soft} strokeWidth="1.4" fill="none" />
    </svg>);
  if (tpl.id === 'starter') return (
    <svg width="150" height="80" viewBox="0 0 150 80">
      <rect x="24" y="14" width="102" height="52" rx="4" fill="none" stroke="#1b603b" strokeWidth="1.5" />
      <text x="34" y="32" fontSize={10} fill={soft} fontFamily="Consolas, monospace">ask "…"</text>
      <text x="34" y="46" fontSize={10} fill={line} fontFamily="Consolas, monospace">print(ans)</text>
      <text x="34" y="60" fontSize={10} fill={soft} fontFamily="Consolas, monospace">for i in range(3)</text>
    </svg>);
  if (tpl.id === 'todo') return (
    /* 完整软件：一张待办清单，带勾选圆点 */
    <svg width="150" height="80" viewBox="0 0 150 80">
      <rect x="26" y="10" width="98" height="60" rx="5" fill="none" stroke={line} strokeWidth="1.5" />
      <rect x="26" y="10" width="98" height="13" rx="5" fill={line} opacity="0.08" />
      {[32, 48, 64].map((y, i) => (
        <g key={y}>
          <circle cx="38" cy={y} r="4.5" fill={i === 0 ? line : 'none'} stroke={line} strokeWidth="1.2" />
          {i === 0 && <path d={`M35.6 ${y}l1.8 1.8 3-3.4`} stroke="#fff" strokeWidth="1.3" fill="none" />}
          <line x1="49" y1={y} x2={108 - i * 14} y2={y} stroke={soft} strokeWidth="3" strokeLinecap="round" />
        </g>
      ))}
    </svg>);
  if (tpl.id === 'login') return (
    /* 界面示例：一张登录卡片 */
    <svg width="150" height="80" viewBox="0 0 150 80">
      <rect x="42" y="8" width="66" height="64" rx="6" fill="none" stroke={line} strokeWidth="1.5" />
      <line x1="52" y1="21" x2="92" y2="21" stroke={line} strokeWidth="3" strokeLinecap="round" />
      <rect x="52" y="30" width="46" height="9" rx="3" fill="none" stroke={soft} strokeWidth="1.2" />
      <rect x="52" y="43" width="46" height="9" rx="3" fill="none" stroke={soft} strokeWidth="1.2" />
      <rect x="52" y="56" width="46" height="9" rx="4" fill={line} />
    </svg>);
  if (tpl.id === 'stock') return (
    /* 后端示例：一张库存表 */
    <svg width="150" height="80" viewBox="0 0 150 80">
      <rect x="30" y="14" width="90" height="52" rx="4" fill="none" stroke={line} strokeWidth="1.5" />
      <line x1="30" y1="28" x2="120" y2="28" stroke={line} strokeWidth="1.4" />
      <line x1="68" y1="28" x2="68" y2="66" stroke={soft} strokeWidth="1" opacity="0.7" />
      {[38, 47, 56].map((y) => (
        <g key={y}>
          <line x1="37" y1={y} x2="60" y2={y} stroke={soft} strokeWidth="2" strokeLinecap="round" />
          <line x1="76" y1={y} x2="112" y2={y} stroke={soft} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        </g>
      ))}
    </svg>);

  if (tpl.id === 'advanced') return (
    <svg width="150" height="80" viewBox="0 0 150 80">
      <rect x="20" y="12" width="56" height="10" rx={2} fill={line} />
      <rect x="20" y="28" width="40" height="10" rx={2} fill={line} opacity={0.55} />
      <rect x="20" y="44" width="48" height="10" rx={2} fill={line} opacity={0.35} />
      <rect x="92" y="20" width="38" height="30" rx="4" fill="none" stroke={line} strokeWidth="1.6" />
      <line x1="92" y1="30" x2="130" y2="30" stroke={line} strokeWidth="1" opacity={0.6} />
      <line x1="92" y1="40" x2="130" y2="40" stroke={line} strokeWidth="1" opacity={0.6} />
    </svg>);
  if (tpl.id === 'pointer') return (
    /* 指针示例：三格内存 + 一个指向第 2 格的箭头，跟"空白工程"明显不是一个东西 */
    <svg width="150" height="80" viewBox="0 0 150 80">
      {[22, 60, 98].map((x, i) => (
        <g key={x}>
          <rect x={x} y="26" width="28" height="28" rx="4" fill="none" stroke={i === 1 ? line : '#1b603b'} strokeWidth="1.6" />
          <text x={x + 14} y="44" fontSize={9.5} fill={i === 1 ? line : soft} textAnchor="middle" fontFamily="Consolas, monospace">
            {i === 1 ? '42' : '·'}
          </text>
          <text x={x + 14} y="64" fontSize={8} fill={soft} textAnchor="middle" fontFamily="Consolas, monospace">+{i}</text>
        </g>
      ))}
      <path d="M74 14v9M69 19l5-5 5 5" stroke={line} strokeWidth="1.4" fill="none" />
      <text x="74" y="9" fontSize={8.5} fill={soft} textAnchor="middle" fontFamily="Consolas, monospace">ptr</text>
    </svg>);

  /* 空白工程：一张纸 */
  return (
    <svg width="150" height="80" viewBox="0 0 150 80">
      <rect x="24" y="16" width="102" height="48" rx="4" fill="none" stroke="#1b603b" strokeWidth="1.5" />
      <text x="75" y="38" fontSize={13} fill={soft} textAnchor="middle" fontWeight={600}>main.co</text>
      <line x1="42" y1="52" x2="108" y2="52" stroke="#1b603b" strokeWidth="2" />
      <line x1="42" y1="52" x2="82" y2="52" stroke={line} strokeWidth="2" />
    </svg>
  );
}

function NewProjectDialog({ preset, onClose, onOpenProject }: {
  preset: Template;
  onClose: () => void;
  /** 建好工程后打开它；界面模板会顺带把 .cui 文件直接打开 */
  onOpenProject: (dir: string, openFile?: string) => void;
}) {
  const [tplId, setTplId] = useState(preset.id);
  const [name, setName] = useState(preset.name);
  const [loc, setLoc] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const def = window.localStorage.getItem('float.newProjectDir');
    if (def) setLoc(def);
  }, []);

  const tpl = TEMPLATES.find((t) => t.id === tplId) ?? TEMPLATES[0];

  const browse = async (): Promise<void> => {
    const dir = await api.pickFolder('选择工程存放文件夹');
    if (dir) {
      setLoc(dir);
      window.localStorage.setItem('float.newProjectDir', dir);
    }
  };

  const create = async (): Promise<void> => {
    if (!loc) { setErr('请选择工程存放位置'); return; }
    if (!name.trim()) { setErr('请填写工程名称'); return; }
    setBusy(true);
    setErr('');
    try {
      const files: Record<string, string> = {};
      for (const [k, v] of Object.entries(tpl.files)) {
        files[k] = k === 'project.json' ? v.replace(/"name": "[^"]*"/, `"name": "${name.trim()}"`) : v;
      }
      const projDir = await api.projectNew(loc, name.trim(), files);
      /* 带界面的模板：建完直接把 .cui 打开，工程里左边就是实时预览 */
      const cuiFile = Object.keys(tpl.files).find((k) => k.endsWith('.cui'));
      if (tpl.preview && cuiFile) {
        const abs = projDir.replace(/[\\/]+$/, '') + '\\' + cuiFile.replace(/\//g, '\\');
        onOpenProject(projDir, abs);
      } else {
        onOpenProject(projDir);
      }
    } catch (e) {
      setErr('创建失败：' + String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mask" onMouseDown={onClose}>
      <div className="dialog npd" onMouseDown={(e) => e.stopPropagation()}>
        <div className="dlg-head"><span>新建工程</span><button className="iconbtn" onClick={onClose}>✕</button></div>
        <div className="npd-tpls">
          {KIND_ORDER.map((kind) => {
            const group = TEMPLATES.filter((t) => t.kind === kind);
            if (group.length === 0) return null;
            return (
              <div key={kind} className="npd-group">
                <div className="npd-grouphead">{KIND_LABEL[kind]}</div>
                <div className="npd-grid">
                  {group.map((t) => (
                    <div key={t.id} className={`npd-tpl ${t.id === tplId ? 'active' : ''}`} onClick={() => setTplId(t.id)}>
                      <div className="npd-thumb"><TplThumb tpl={t} active={t.id === tplId} /></div>
                      <div className="npd-tplname">{t.name}</div>
                      <div className="npd-tpldesc">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="form-row">
          <label>工程名称</label>
          <input type="text" className="grow" value={name} onChange={(e) => setName(e.target.value)} placeholder="我的脚本" />
        </div>
        <div className="form-row">
          <label>存放位置</label>
          <input type="text" className="grow" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="选择文件夹……" />
          <button className="btn" onClick={() => void browse()}>浏览</button>
        </div>
        {err && <div style={{ color: 'var(--danger)', fontSize: 12.5 }}>{err}</div>}
        <div className="dlg-foot">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" disabled={busy} onClick={() => void create()}>{busy ? '正在创建……' : '创建'}</button>
        </div>
      </div>
    </div>
  );
}

/** 在欢迎页里跑一段教学代码（不依赖工程） */
async function runOnce(code: string): Promise<{ out: string[]; error: string | null }> {
  const out: string[] = [];
  let error: string | null = null;
  const file = '__tutorial__.co';
  const sources = new Map<string, string>([[file, code]]);
  await new Promise<void>((done) => {
    let settled = false;
    const finish = (): void => { if (!settled) { settled = true; done(); } };
    const r = new Runner(file, {
      output: (l) => { if (l.kind === 'out') out.push(l.text); else if (l.kind === 'err') error = l.text; },
      onError: (e) => { error = e.message; },
      onState: () => {},
      onPaused: () => { window.setTimeout(() => r.resume(), 0); },
      onDone: finish
    }, '.', sources);
    try { r.start('run'); } catch (e) { error = String(e); finish(); }
    window.setTimeout(finish, 8000);
  });
  return { out, error };
}

/** 欢迎页里的学习中心：整页铺开（不是那个简陋的弹窗）。
 *  这里没有编辑器，所以不显示「在编辑器中打开」；运行结果直接显示在代码块下面。 */
function LearnPage({ onClose }: { onClose: () => void }) {
  return (
    <div className="learn-page">
      <div className="learn-page-head">
        <button className="btn" onClick={onClose}>← 返回欢迎页</button>
        <span className="tool-grow" />
        <span className="learn-page-hint">打开工程后按 Ctrl+Shift+H 随时回到这里</span>
      </div>
      <div className="learn-page-body">
        <TutorialPage
          onRun={async (code) => {
            const res = await runOnce(code);
            return res.error ? '错误：' + res.error : (res.out.join('\n') || '（没有输出）');
          }}
        />
      </div>
    </div>
  );
}


export function Welcome({ onOpenProject, onOpenFile }: {
  onOpenProject: (dir: string, openFile?: string) => void;
  /** 直接打开一个 .co 文件（会连带打开它所在的文件夹） */
  onOpenFile?: (file: string) => void;
}) {
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [busy, setBusy] = useState('');
  const [newTpl, setNewTpl] = useState<Template | null>(null);
  const [showAppearance, setShowAppearance] = useState(false);
  const [learn, setLearn] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [settings, setSettings] = useState(false);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.recentGet().then(setRecents).catch(() => setRecents([]));
  }, []);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return recents;
    return recents.filter((r) => r.name.toLowerCase().includes(k) || r.path.toLowerCase().includes(k));
  }, [recents, q]);

  const openExisting = async (): Promise<void> => {
    const dir = await api.pickFolder('选择工程文件夹（含 project.json）');
    if (!dir) return;
    onOpenProject(dir);
  };

  /** 直接打开单个 .co 文件：对话框里能看见脚本文件，不再只有文件夹 */
  const openSingleFile = async (): Promise<void> => {
    const f = await api.pickOpenFile('打开文件（Copper / Copper UI / Markdown / JSON / TXT）', ['co', 'cw', 'cui', 'md', 'json', 'txt', 'in']);
    if (!f) return;
    if (onOpenFile) onOpenFile(f);
    else onOpenProject(f.replace(/[\\/][^\\/]*$/, ''));
  };

  const importZip = async (): Promise<void> => {
    const zip = await api.pickSaveFile('选择 .cw 工程包', '', 'cw');
    if (!zip) return;
    setBusy('正在导入……');
    try {
      const destRoot = zip.replace(/[\\/]+$/, '').replace(/\.(cw|floatzip|float)$/i, '');
      const projDir = await api.projectImportZip(zip, destRoot);
      onOpenProject(projDir);
    } catch (e) {
      setErr('导入失败：' + String(e));
    } finally {
      setBusy('');
    }
  };

  const removeRecent = async (path: string): Promise<void> => {
    await api.recentRemove(path).catch(() => {});
    setRecents((l) => l.filter((r) => r.path !== path));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement)?.tagName;
      const mod = e.ctrlKey || e.metaKey;
      if (e.code === 'F1') { e.preventDefault(); setShortcuts(true); return; }
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (mod && e.code === 'KeyN') { e.preventDefault(); setNewTpl(TEMPLATES[1]); return; }
      if (mod && e.code === 'KeyO') { e.preventDefault(); if (e.shiftKey) void importZip(); else void openSingleFile(); return; }
      if (mod && e.altKey && e.code === 'KeyS') { e.preventDefault(); setSettings(true); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openExisting, importZip]);

  const menus: MenuGroup[] = [
    {
      label: '文件',
      items: [
        { label: '新建工程', hint: 'Ctrl+N', run: () => setNewTpl(TEMPLATES[1]) },
        { label: '打开文件（.co / .md / .json / .txt）', hint: 'Ctrl+O', run: () => void openSingleFile() },
        { label: '导入工程包', hint: 'Ctrl+Shift+O', run: () => void importZip() },
        { sep: true, label: 's1' },
        { label: '退出', hint: 'Alt+F4', run: () => { void import('@tauri-apps/api/window').then((m) => m.getCurrentWindow().close()).catch(() => {}); } }
      ]
    },
    {
      label: '视图',
      items: [
        { label: '偏好设置…', hint: 'Ctrl+Alt+S', run: () => setSettings(true) },
        { label: '外观与背景…', run: () => setShowAppearance(true) }
      ]
    },
    {
      label: '帮助',
      items: [
        { label: '学习中心（Copper / Copper UI 教程）', hint: 'Ctrl+Shift+H', run: () => setLearn(true) },
        { label: '快捷键一览', hint: 'F1', run: () => setShortcuts(true) }
      ]
    }
  ];

  const cards = [
    { icon: <IconPlus size={18} />, title: '新建工程', desc: '从模板起步', run: () => setNewTpl(TEMPLATES[1]) },
    { icon: <IconFile size={18} />, title: '打开文件', desc: '.co / .cui / .md / .json / .txt，连所在文件夹一起打开', run: () => void openSingleFile() },
    { icon: <IconImport size={18} />, title: '导入工程包', desc: '.float 一键搬入', run: () => void importZip() },
    { icon: <IconBook size={18} />, title: '学习中心', desc: `${TUTORIAL_STATS.chapters} 章 · ${TUTORIAL_STATS.sections} 节 · 可运行示例`, run: () => setLearn(true) },
    { icon: <IconImage size={18} />, title: '外观背景', desc: '换一张自己的图', run: () => setShowAppearance(true) },
    { icon: <IconSearch size={18} />, title: '最近工程', desc: `${recents.length} 个记录`, run: () => { if (recents[0]) onOpenProject(recents[0].path); else setNewTpl(TEMPLATES[0]); } }
  ];

  return (
    <div className="wc" style={{ position: 'relative' }}>
      <TitleBar
        title="Float Studio"
        subtitle="代码世界脚本工作室"
        right={<button className="tb-link" onClick={() => setShowAppearance(true)}><IconImage size={13} /> 外观</button>}
      />

      <MenuBar menus={menus} />
      <div className="wc-body">
        <aside className="wc-side">
          <div className="wc-side-head">项目</div>
          <div className="wc-acts">
            <button className="wc-act" onClick={() => setNewTpl(TEMPLATES[1])}><IconPlus size={15} /> 新建工程…</button>
            <button className="wc-act" onClick={() => void openExisting()}><IconFolder size={15} /> 打开文件夹…</button>
            <button className="wc-act" onClick={() => void openSingleFile()}><IconFile size={15} /> 打开文件…</button>
            <button className="wc-act" onClick={() => setNewTpl(TEMPLATES.find((t) => t.kind === 'ui') ?? TEMPLATES[1])}><IconPlus size={15} /> 新建界面（.cui）</button>
            <button className="wc-act" onClick={() => void importZip()}><IconImport size={15} /> 导入工程包…</button>
          </div>

          <div className="wc-search">
            <IconSearch size={13} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索项目" />
          </div>

          <div className="wc-recents">
            {filtered.length === 0 && (
              <div className="wc-empty">{q ? '没有匹配的项目' : '还没有打开过工程'}</div>
            )}
            {filtered.map((r) => (
              <div key={r.path} className="wc-recent" onClick={() => onOpenProject(r.path)} title={r.path}>
                <span className="wc-recent-icon"><IconFolder size={15} /></span>
                <span className="wc-recent-main">
                  <b>{r.name}</b>
                  <i>{r.path}</i>
                </span>
                <span
                  className="wc-recent-x"
                  title="从列表移除（不删文件）"
                  onClick={(e) => { e.stopPropagation(); void removeRecent(r.path); }}
                >
                  <IconClose size={11} />
                </span>
              </div>
            ))}
          </div>
        </aside>

        <main className="wc-main">
          <div className="wc-hero">
            <div className="wc-logo"><Logo size={84} /></div>
            <h1>欢迎使用 Float Studio</h1>
            <p className="wc-sub">给代码世界一个正经的 IDE</p>

            <div className="wc-cards">
              {cards.map((c) => (
                <button key={c.title} className="wc-card" onClick={c.run}>
                  <span className="wc-card-icon">{c.icon}</span>
                  <b>{c.title}</b>
                  <i>{c.desc}</i>
                </button>
              ))}
            </div>

            <div className="wc-tip">F5 运行 · F6 调试 · Ctrl+S 保存 · Ctrl+Shift+P 命令面板</div>
          </div>
          {busy && <div className="wc-busy">{busy}</div>}
          {err && (
            <div className="wc-busy err">
              {err}
              <button className="wc-err-x" onClick={() => setErr('')}>✕</button>
            </div>
          )}
        </main>
      </div>

      <div className="wc-foot">
        <span>v0.6.0 · 小方工作室 · MIT</span>
        <span className="grow" />
        <span className="muted">Copper</span>
      </div>

      {newTpl && (
        <NewProjectDialog
          preset={newTpl}
          onClose={() => setNewTpl(null)}
          onOpenProject={onOpenProject}
        />
      )}
      {showAppearance && <AppearanceDialog onClose={() => setShowAppearance(false)} />}
      {learn && <LearnPage onClose={() => setLearn(false)} />}
      {shortcuts && <ShortcutsDialog onClose={() => setShortcuts(false)} />}
      {settings && <SettingsDialog onClose={() => setSettings(false)} onAppearance={() => setShowAppearance(true)} />}
    </div>
  );
}
