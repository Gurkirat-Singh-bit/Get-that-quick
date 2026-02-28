/**
 * @fileoverview Template editor modal — full-screen overlay for editing templates.
 *
 * Supports editing the template's metadata (title, description, category)
 * and the prompt body in a textarea with monospace font.
 *
 * @module components/templates/template-editor
 */

import { useState, useEffect, useCallback } from "react";
import { X, Save, Tag, FileCode2, Loader2 } from "lucide-react";
import type { Template } from "@shared/types";

interface TemplateEditorProps {
  /** Template ID to edit, or null if closed. */
  templateId: string | null;
  /** Fetch full template data by ID. */
  getTemplate: (id: string) => Promise<Template>;
  /** Save template updates. */
  onSave: (id: string, updates: Partial<Template>) => Promise<Template>;
  /** Close the editor. */
  onClose: () => void;
}

export function TemplateEditor({ templateId, getTemplate, onSave, onClose }: TemplateEditorProps) {
  const [, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);

  // Load template data
  useEffect(() => {
    if (!templateId) return;
    setLoading(true);
    getTemplate(templateId)
      .then((t) => {
        setTemplate(t);
        setTitle(t.title);
        setDescription(t.description);
        setCategory(t.category);
        setContent(t.content);
        setDirty(false);
      })
      .catch((err) => {
        console.error("[TemplateEditor] Failed to load:", err);
      })
      .finally(() => setLoading(false));
  }, [templateId, getTemplate]);

  const handleSave = useCallback(async () => {
    if (!templateId || !dirty) return;
    setSaving(true);
    try {
      await onSave(templateId, {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        content,
      });
      setDirty(false);
    } catch (err) {
      console.error("[TemplateEditor] Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [templateId, title, description, category, content, dirty, onSave]);

  // Keyboard shortcut: Ctrl/Cmd+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave, onClose]);

  if (!templateId) return null;

  const markDirty = () => { if (!dirty) setDirty(true); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[720px] max-h-[85vh] bg-[#0E0E10] border border-[#1A1A1E] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1E] shrink-0">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-zinc-200">Edit Template</h2>
            {dirty && (
              <span className="text-[9px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full">unsaved</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Save
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Metadata row */}
            <div className="px-6 py-4 space-y-3 border-b border-[#1A1A1E] shrink-0">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); markDirty(); }}
                    className="w-full bg-[#0A0A0B] border border-[#1A1A1E] rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none focus:border-primary/30"
                  />
                </div>
                <div className="w-36">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Category</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => { setCategory(e.target.value); markDirty(); }}
                      className="w-full bg-[#0A0A0B] border border-[#1A1A1E] rounded-lg pl-7 pr-3 py-2 text-xs text-zinc-300 outline-none focus:border-primary/30"
                    />
                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-600" />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1 block">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); markDirty(); }}
                  className="w-full bg-[#0A0A0B] border border-[#1A1A1E] rounded-lg px-3 py-2 text-xs text-zinc-300 outline-none focus:border-primary/30"
                  placeholder="Short description of what this template does"
                />
              </div>
            </div>

            {/* Prompt body */}
            <div className="flex-1 flex flex-col overflow-hidden px-6 py-4">
              <label className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2 block">System Prompt</label>
              <textarea
                value={content}
                onChange={(e) => { setContent(e.target.value); markDirty(); }}
                className="flex-1 w-full bg-[#0A0A0B] border border-[#1A1A1E] rounded-lg p-4 text-xs text-zinc-300 font-mono leading-relaxed outline-none focus:border-primary/30 resize-none"
                placeholder="Write your system prompt here..."
                spellCheck={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
