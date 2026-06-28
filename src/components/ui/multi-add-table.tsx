"use client";

import React, { useState } from "react";
import { Plus, Trash2, Save, Sparkles, Check, AlertCircle, Link as LinkIcon } from "lucide-react";
import { Button } from "./button";
import { TitleAutocomplete } from "./title-autocomplete";
import { memoryService } from "@/lib/memory-service";

export interface RowData {
  id: string;
  title: string;
  category: string;
  date: string;
  fromTime: string;
  toTime: string;
  duration: string;
  content: string;
  tagsString: string;
  linkCount: number;
}

interface MultiAddTableProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

// Duration Calculator
export function calculateDuration(fromStr: string, toStr: string): string {
  if (!fromStr || !toStr) return "";
  const [fromH, fromM] = fromStr.split(":").map(Number);
  const [toH, toM] = toStr.split(":").map(Number);
  if (isNaN(fromH) || isNaN(fromM) || isNaN(toH) || isNaN(toM)) return "";

  let diffMin = (toH * 60 + toM) - (fromH * 60 + fromM);
  if (diffMin < 0) {
    // Crosses midnight, add 24 hours
    diffMin += 24 * 60;
  }

  if (diffMin < 60) {
    return `${diffMin} Minutes`;
  } else {
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return mins > 0
      ? `${hours} Hour${hours > 1 ? "s" : ""} ${mins} Minute${mins > 1 ? "s" : ""}`
      : `${hours} Hour${hours > 1 ? "s" : ""}`;
  }
}

// URL detection
export function countUrls(text: string): number {
  if (!text) return 0;
  const matches = text.match(/https?:\/\/[^\s/$.?#].[^\s]*/gi);
  return matches ? matches.length : 0;
}

export function MultiAddTable({ userId, onSuccess, onCancel }: MultiAddTableProps) {
  const createEmptyRow = (): RowData => ({
    id: "row-" + Date.now() + Math.random().toString(36).substr(2, 5),
    title: "",
    category: "Note",
    date: new Date().toISOString().split("T")[0],
    fromTime: "09:00",
    toTime: "09:40",
    duration: "40 Minutes",
    content: "",
    tagsString: "",
    linkCount: 0,
  });

  const [rows, setRows] = useState<RowData[]>([createEmptyRow()]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ total: number; completed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleAddRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) {
      setError("You must have at least one row.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    setRows(rows.filter((row) => row.id !== id));
  };

  const updateRowField = (id: string, field: keyof RowData, value: any) => {
    setRows(
      rows.map((row) => {
        if (row.id !== id) return row;

        const updatedRow = { ...row, [field]: value };

        // Recalculate duration if time fields change
        if (field === "fromTime" || field === "toTime") {
          updatedRow.duration = calculateDuration(
            updatedRow.fromTime,
            updatedRow.toTime
          );
        }

        // Recalculate link count if description changes
        if (field === "content") {
          updatedRow.linkCount = countUrls(updatedRow.content);
        }

        return updatedRow;
      })
    );
  };

  const handleSaveAll = async () => {
    setError(null);

    // Validate rows
    const invalidRow = rows.find(
      (row) => !row.title.trim() || !row.content.trim()
    );
    if (invalidRow) {
      setError("Please fill in Title and Content for all rows before saving.");
      return;
    }

    setIsSaving(true);
    setSaveProgress({ total: rows.length, completed: 0 });

    try {
      // Save all logs concurrently
      await Promise.all(
        rows.map(async (row) => {
          // Parse tags
          const tags = row.tagsString
            .split(",")
            .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
            .filter(Boolean);

          await memoryService.createMemory({
            title: row.title.trim(),
            content: row.content.trim(),
            category: row.category,
            date: row.date,
            time: row.fromTime, // set standard time to fromTime for compatibility
            fromTime: row.fromTime,
            toTime: row.toTime,
            duration: row.duration,
            tags,
            userId,
            images: [],
            audios: [],
            documents: [],
            summary: "",
          });

          setSaveProgress((prev) =>
            prev ? { ...prev, completed: prev.completed + 1 } : null
          );
        })
      );

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
      }, 1000);
    } catch (e) {
      console.error(e);
      setError("An error occurred while saving. Please try again.");
    } finally {
      setIsSaving(false);
      setSaveProgress(null);
    }
  };

  return (
    <div className="space-y-6 w-full animate-in fade-in duration-300">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-900 pb-4">
        <div className="flex flex-col text-left">
          <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-400">Spreadsheet Mode</span>
          <h2 className="text-sm font-bold text-neutral-950 dark:text-white">Multi-Add Activity Logger</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            className="h-9 px-4 rounded-xl text-[10px] font-mono uppercase tracking-wider text-neutral-500 hover:text-neutral-900 dark:hover:text-white border-neutral-200 dark:border-neutral-800"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving || rows.length === 0}
            className="h-9 px-4 rounded-xl text-[10px] font-mono uppercase tracking-wider bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:bg-neutral-900 dark:hover:bg-neutral-100 flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
          >
            {success ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                <span>All Saved!</span>
              </>
            ) : isSaving ? (
              <>
                <div className="h-3.5 w-3.5 rounded-full border border-transparent border-t-current animate-spin" />
                <span>Saving ({saveProgress?.completed}/{saveProgress?.total})...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save All ({rows.length})</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-2xl flex items-center gap-2.5 text-red-500 text-xs animate-in slide-in-from-top-2 duration-200 text-left">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Table Container */}
      <div className="border border-neutral-100 dark:border-neutral-900 rounded-3xl overflow-hidden premium-shadow-sm bg-white dark:bg-neutral-950">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-neutral-50/50 dark:bg-neutral-900/30 border-b border-neutral-100 dark:border-neutral-900 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-52">Title</th>
                <th className="py-3 px-4 w-32">Category</th>
                <th className="py-3 px-4 w-40">Date</th>
                <th className="py-3 px-4 w-28">From Time</th>
                <th className="py-3 px-4 w-28">To Time</th>
                <th className="py-3 px-4 w-32">Duration</th>
                <th className="py-3 px-4 w-96">Description</th>
                <th className="py-3 px-4 w-44">Tags</th>
                <th className="py-3 px-4 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-900 text-xs">
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-neutral-50/30 dark:hover:bg-neutral-900/10 transition-colors">
                  {/* index */}
                  <td className="py-2.5 px-4 text-center font-mono text-[10px] text-neutral-400">
                    {index + 1}
                  </td>

                  {/* Title */}
                  <td className="py-2.5 px-3">
                    <TitleAutocomplete
                      value={row.title}
                      onChange={(val) => updateRowField(row.id, "title", val)}
                      placeholder="e.g. Classwork"
                      className="h-9 px-2.5 rounded-lg font-semibold bg-transparent dark:bg-transparent border border-neutral-150 dark:border-neutral-900 hover:border-neutral-250 focus-visible:border-neutral-300 dark:focus-visible:border-neutral-850"
                    />
                  </td>

                  {/* Category */}
                  <td className="py-2.5 px-3">
                    <select
                      value={row.category}
                      onChange={(e) => updateRowField(row.id, "category", e.target.value)}
                      className="w-full h-9 bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-150 dark:border-neutral-900 rounded-lg px-2.5 text-xs text-neutral-800 dark:text-neutral-200 font-semibold focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-800"
                    >
                      <option value="Note">Note</option>
                      <option value="Activity">Activity</option>
                      <option value="Insight">Insight</option>
                      <option value="Reminder">Reminder</option>
                      <option value="Class Work">Class Work</option>
                      <option value="Parent Meeting">Parent Meeting</option>
                      <option value="Parent Calling">Parent Calling</option>
                      <option value="Student Interaction">Student Interaction</option>
                      <option value="Meeting @person">Meeting @person</option>
                      <option value="Project Work">Project Work</option>
                      <option value="Student Issue">Student Issue</option>
                    </select>
                  </td>

                  {/* Date */}
                  <td className="py-2.5 px-3">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRowField(row.id, "date", e.target.value)}
                      className="w-full h-9 bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-150 dark:border-neutral-900 rounded-lg px-2.5 text-xs text-neutral-800 dark:text-neutral-200 font-mono focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-800"
                    />
                  </td>

                  {/* From Time */}
                  <td className="py-2.5 px-3">
                    <input
                      type="time"
                      value={row.fromTime}
                      onChange={(e) => updateRowField(row.id, "fromTime", e.target.value)}
                      className="w-full h-9 bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-150 dark:border-neutral-900 rounded-lg px-2.5 text-xs text-neutral-800 dark:text-neutral-200 font-mono focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-800"
                    />
                  </td>

                  {/* To Time */}
                  <td className="py-2.5 px-3">
                    <input
                      type="time"
                      value={row.toTime}
                      onChange={(e) => updateRowField(row.id, "toTime", e.target.value)}
                      className="w-full h-9 bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-150 dark:border-neutral-900 rounded-lg px-2.5 text-xs text-neutral-800 dark:text-neutral-200 font-mono focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-800"
                    />
                  </td>

                  {/* Duration */}
                  <td className="py-2.5 px-3">
                    <div className="w-full h-9 bg-neutral-50/20 dark:bg-neutral-900/20 border border-transparent rounded-lg px-2.5 flex items-center font-mono text-[10px] text-neutral-450 dark:text-neutral-500 font-medium">
                      {row.duration || "—"}
                    </div>
                  </td>

                  {/* Description */}
                  <td className="py-2.5 px-3">
                    <div className="relative flex items-center">
                      <textarea
                        placeholder="Content of memory..."
                        value={row.content}
                        onChange={(e) => updateRowField(row.id, "content", e.target.value)}
                        rows={2}
                        className="w-full min-h-[56px] py-1.5 px-2.5 bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-150 dark:border-neutral-900 rounded-lg text-xs text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-800 resize-y"
                      />
                      {row.linkCount > 0 && (
                        <div className="absolute right-2.5 bottom-2 flex items-center gap-1 text-[9px] font-mono bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 px-1.5 py-0.5 rounded shadow-sm">
                          <LinkIcon className="w-2.5 h-2.5" />
                          <span>{row.linkCount}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Tags */}
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      placeholder="comma-separated tags..."
                      value={row.tagsString}
                      onChange={(e) => updateRowField(row.id, "tagsString", e.target.value)}
                      className="w-full h-9 bg-neutral-50/50 dark:bg-neutral-900/40 border border-neutral-150 dark:border-neutral-900 rounded-lg px-2.5 text-xs text-neutral-850 dark:text-neutral-200 placeholder:text-neutral-400 font-mono focus:outline-none focus:border-neutral-300 dark:focus:border-neutral-800"
                    />
                  </td>

                  {/* Delete row button */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="w-8 h-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-neutral-400 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer outline-none"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Row bar */}
        <div className="p-3 border-t border-neutral-100 dark:border-neutral-900 bg-neutral-50/30 dark:bg-neutral-900/10 flex justify-start">
          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-mono uppercase tracking-wider bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 hover:opacity-90 active:scale-95 transition-all cursor-pointer font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>
      </div>
    </div>
  );
}
