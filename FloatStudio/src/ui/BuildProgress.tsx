/* 中央编译进度条：编译成 EXE 时弹在屏幕正中，走完自动消失。 */

import React from 'react';

export type BuildProgressState = { percent: number; label: string; note?: string };

export function BuildProgress({ open, state }: { open: boolean; state: BuildProgressState | null }): React.ReactElement | null {
  if (!open || !state) return null;
  return (
    <div className="build-modal-mask" role="dialog" aria-label="编译进度">
      <div className="build-modal">
        <div className="build-modal-title">编译成 EXE</div>
        <div className="build-modal-bar">
          <div className="build-modal-fill" style={{ width: `${state.percent}%` }} />
        </div>
        <div className="build-modal-row">
          <span>{state.label}</span>
          <span className="build-modal-pct">{state.percent}%</span>
        </div>
        {state.note && <div className="build-modal-note">{state.note}</div>}
      </div>
    </div>
  );
}
