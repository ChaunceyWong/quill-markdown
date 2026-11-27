import { useEffect, useRef } from 'react';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap, drawSelection, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

interface Props {
  value: string;
  onChange: (next: string) => void;
  onSave: () => void;
  onPasteImage: (path: string) => void;
  theme: 'light' | 'dark';
}

function highlightStyle(dark: boolean) {
  return HighlightStyle.define([
    { tag: tags.heading, fontWeight: '700', fontSize: '1.15em' },
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strong, fontWeight: '700' },
    { tag: tags.link, color: dark ? '#58a6ff' : '#4f8ff7', textDecoration: 'underline' },
    { tag: tags.monospace, fontFamily: 'ui-monospace, SFMono-Regular, monospace' },
    { tag: tags.quote, color: dark ? '#8d96a0' : '#888', fontStyle: 'italic' },
    { tag: tags.list, color: dark ? '#e3b341' : '#d1742c' },
  ]);
}

function themeExtension(theme: 'light' | 'dark') {
  const dark = theme === 'dark';
  return [
    EditorView.theme(
      {
        // Leave the background unset so the host's --bg (which eye-care mode
        // repaints warm) shows through instead of a hardcoded white.
        '&': { height: '100%', fontSize: '14px', backgroundColor: 'transparent', color: dark ? '#e6edf3' : '#24292f' },
        '.cm-scroller': {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          lineHeight: '1.6',
          overflow: 'auto',
        },
        '.cm-content': { padding: '20px 24px', caretColor: dark ? '#58a6ff' : '#4f8ff7' },
        '.cm-gutters': { display: 'none' },
        '&.cm-focused': { outline: 'none' },
        '.cm-activeLine': { backgroundColor: dark ? '#161b22' : 'rgba(0,0,0,0.04)' },
        '.cm-selectionBackground': { backgroundColor: dark ? '#264f78' : '#b6d7ff' },
      },
      { dark }
    ),
    syntaxHighlighting(highlightStyle(dark)),
  ];
}

export function Editor({ value, onChange, onSave, onPasteImage, theme }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartment = useRef(new Compartment());
  const cbRef = useRef({ onChange, onSave, onPasteImage });
  cbRef.current = { onChange, onSave, onPasteImage };

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          drawSelection(),
          highlightActiveLine(),
          markdown({ base: markdownLanguage }),
          keymap.of([
            {
              key: 'Mod-s',
              preventDefault: true,
              run: () => {
                cbRef.current.onSave();
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              cbRef.current.onChange(update.state.doc.toString());
            }
          }),
          EditorView.domEventHandlers({
            paste: (event) => {
              const items = Array.from(event.clipboardData?.items || []);
              const image = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'));
              if (!image) return false;
              const file = image.getAsFile();
              if (!file) return false;
              event.preventDefault();
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = String(reader.result);
                window.__writeTempImage?.(dataUrl).then((p) => {
                  if (p) cbRef.current.onPasteImage(p);
                });
              };
              reader.readAsDataURL(file);
              return true;
            },
          }),
          themeCompartment.current.of(themeExtension(theme)),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Editor is created once per document (parent uses `key={active.path}`).
    // Theme changes are handled by the effect below via Compartment reconfiguration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: themeCompartment.current.reconfigure(themeExtension(theme)) });
    hostRef.current?.setAttribute('data-cm-theme', theme);
  }, [theme]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() !== value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div className="editor-host" ref={hostRef} data-cm-theme={theme} />;
}
