'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { cx } from './ui';

interface UI {
  open: (node: ReactNode) => void;
  close: () => void;
  toast: (text: string) => void;
  confirm: (text: ReactNode, fn: () => void, label?: string) => void;
  print: (node: ReactNode) => void;
}
const Ctx = createContext<UI | null>(null);
export const useUI = () => useContext(Ctx)!;

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<ReactNode>(null);
  const [toastMsg, setToast] = useState<{ id: number; text: string } | null>(null);
  const [printNode, setPrintNode] = useState<ReactNode>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const close = useCallback(() => {
    setNode(null);
    const el = lastFocus.current;
    setTimeout(() => { if (el && document.contains(el)) el.focus(); }, 0);
  }, []);
  const open = useCallback((n: ReactNode) => {
    lastFocus.current = document.activeElement as HTMLElement;
    setNode(n);
  }, []);
  const toast = useCallback((text: string) => {
    setToast({ id: Date.now(), text });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  const confirm = useCallback((text: ReactNode, fn: () => void, label = 'Видалити') => {
    open(<Modal title="Підтвердження" primary={label} danger onSave={() => { fn(); }}><p>{text}</p></Modal>);
  }, [open]);
  const print = useCallback((n: ReactNode) => setPrintNode(n), []);

  useEffect(() => {
    if (!printNode) return;
    const t = setTimeout(() => {
      try { window.print(); } catch { /* ignore */ }
      setPrintNode(null);
    }, 50);
    return () => clearTimeout(t);
  }, [printNode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && node) close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [node, close]);

  return (
    <Ctx.Provider value={{ open, close, toast, confirm, print }}>
      {children}
      <div id="modal-root">{node}</div>
      {toastMsg && <div className="toast" role="status" key={toastMsg.id}>{toastMsg.text}</div>}
      <div id="print-area">{printNode}</div>
    </Ctx.Provider>
  );
}

/**
 * Діалог. onSave повертає рядок, якщо треба показати помилку,
 * false, якщо діалог має лишитися відкритим, інакше діалог закривається.
 */
export function Modal({ title, children, onSave, primary = 'Зберегти', lg, left, danger }: {
  title: ReactNode; children: ReactNode; onSave?: () => unknown; primary?: string; lg?: boolean; left?: ReactNode; danger?: boolean;
}) {
  const ui = useUI();
  const [err, setErr] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => {
      const f = box.current?.querySelector<HTMLElement>('.modal-b input:not([type=checkbox]):not([type=file]), .modal-b select, .modal-b textarea')
        || box.current?.querySelector<HTMLElement>('[data-close]');
      f?.focus();
    }, 30);
    return () => clearTimeout(t);
  }, []);
  const save = () => {
    const r = onSave?.();
    if (typeof r === 'string') { setErr(r); return; }
    if (r === false) return;
    ui.close();
  };
  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) ui.close(); }}>
      <div ref={box} className={cx('modal', lg && 'lg')} role="dialog" aria-modal="true" aria-labelledby="mTitle">
        <div className="modal-h">
          <h2 id="mTitle">{title}</h2>
          <button type="button" className="icon-btn x" onClick={ui.close} aria-label="Закрити" data-close><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-b">{children}<p className="form-error" role="alert">{err}</p></div>
        <div className="modal-f">
          {left && <div className="l">{left}</div>}
          <button type="button" className="btn" onClick={ui.close}>{onSave ? 'Скасувати' : 'Закрити'}</button>
          {onSave && <button type="button" className={cx('btn', danger ? 'danger' : 'primary')} onClick={save}>{primary}</button>}
        </div>
      </div>
    </div>
  );
}
