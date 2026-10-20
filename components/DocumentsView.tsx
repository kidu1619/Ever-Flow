"use client";

import { useEffect, useState, useRef } from "react";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Eye,
  History,
  Tag,
  Download,
  AlertTriangle,
  X,
  FileCheck2,
  Upload,
  Paperclip,
} from "lucide-react";
import { Role } from "@/lib/auth/permissions";

interface DocumentVersion {
  versionNumber: number;
  fileUrl: string;
  storageKey: string;
  fileSizeKB: number;
  uploadedByName: string;
  uploadedAt: string;
  notes?: string;
}

interface RecordedApproval {
  requestedToName: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
  decidedByName?: string;
  decidedAt?: string;
  decisionComment?: string;
  disclaimer: string;
}

interface DocumentItem {
  id: string;
  event?: { id: string; name: string };
  eventName?: string;
  title: string;
  category: string;
  tags: string[];
  visibility: "internal" | "shared_with_client" | "shared_with_vendor";
  currentVersion: number;
  fileUrl: string;
  storageKey: string;
  fileSizeKB: number;
  fileType: string;
  versions: DocumentVersion[];
  approval?: RecordedApproval;
  uploadedByName: string;
  createdAt: string;
}

interface DocumentsViewProps {
  events: { id: string; name: string }[];
  currentRole: Role | null;
  notify: (text: string, type?: "success" | "error") => void;
  canManage: boolean;
}

const CATEGORIES = [
  "All",
  "Contract",
  "Proposal",
  "Quotation",
  "Invoice",
  "RunSheet",
  "Brief",
  "Compliance",
  "General",
];

export default function DocumentsView({ events, currentRole, notify, canManage }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  // Upload Form
  const [upEventId, setUpEventId] = useState("");
  const [upTitle, setUpTitle] = useState("");
  const [upCategory, setUpCategory] = useState("Contract");
  const [upTags, setUpTags] = useState("");
  const [upVisibility, setUpVisibility] = useState<"internal" | "shared_with_client" | "shared_with_vendor">("internal");
  const [upFileType, setUpFileType] = useState("PDF");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Version Form
  const [verNotes, setVerNotes] = useState("");
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionFileBase64, setVersionFileBase64] = useState("");
  const [isVersionDragging, setIsVersionDragging] = useState(false);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const versionFileInputRef = useRef<HTMLInputElement | null>(null);

  // Approval Form
  const [appDecision, setAppDecision] = useState<"approved" | "rejected">("approved");
  const [appComment, setAppComment] = useState("");

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    if (!upTitle.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setUpTitle(cleanName);
    }
    const ext = file.name.split(".").pop()?.toUpperCase() || "";
    if (ext === "PDF") setUpFileType("PDF");
    else if (["DOC", "DOCX"].includes(ext)) setUpFileType("DOCX");
    else if (["XLS", "XLSX", "CSV"].includes(ext)) setUpFileType("XLSX");

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVersionFileSelect = (file: File) => {
    setVersionFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setVersionFileBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const url = selectedCategory !== "All" ? `/api/documents?category=${selectedCategory}` : "/api/documents";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error("Failed to load documents", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [selectedCategory]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    try {
      setIsUploading(true);
      const fileSizeKB = selectedFile ? Math.round(selectedFile.size / 1024) : 240;
      const fileUrl = fileBase64 || "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800";

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upload",
          eventId: upEventId || undefined,
          title: upTitle,
          category: upCategory,
          tags: upTags.split(",").map((t) => t.trim()).filter(Boolean),
          visibility: upVisibility,
          fileType: upFileType,
          fileSizeKB,
          fileUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Document "${data.document.title}" saved successfully!`);
      setShowUploadModal(false);
      setUpTitle("");
      setUpTags("");
      setSelectedFile(null);
      setFileBase64("");
      await loadDocuments();
    } catch (err: any) {
      notify(err.message || "Failed to upload document", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || isUploadingVersion) return;
    try {
      setIsUploadingVersion(true);
      const fileSizeKB = versionFile ? Math.round(versionFile.size / 1024) : selectedDoc.fileSizeKB;
      const fileUrl = versionFileBase64 || selectedDoc.fileUrl;

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "new_version",
          documentId: selectedDoc.id,
          notes: verNotes,
          fileUrl,
          fileSizeKB,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`New version v${data.document.currentVersion} saved!`);
      setShowVersionModal(false);
      setVerNotes("");
      setVersionFile(null);
      setVersionFileBase64("");
      await loadDocuments();
    } catch (err: any) {
      notify(err.message || "Failed to upload new version", "error");
    } finally {
      setIsUploadingVersion(false);
    }
  };

  const handleDecideApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "decide_approval",
          documentId: selectedDoc.id,
          decision: appDecision,
          comment: appComment,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error);

      notify(`Approval decision "${appDecision}" recorded!`);
      setShowApprovalModal(false);
      setAppComment("");
      loadDocuments();
    } catch (err: any) {
      notify(err.message || "Failed to record approval decision", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 font-serif">Documents, Contracts & Approvals</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#E06B53]/15 text-[#E06B53]">
              Documentation & Approvals
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Central repository with version history, sharing controls, and recorded stakeholder sign-offs.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-xl bg-[#E06B53] hover:bg-[#c95841] text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Categories Bar */}
      <div className="flex items-center space-x-1.5 overflow-x-auto text-xs pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
              selectedCategory === cat
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Document Records Table */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Document Title & Category</th>
              <th className="py-3 px-4">Event</th>
              <th className="py-3 px-4">Version & Size</th>
              <th className="py-3 px-4">Visibility Setting</th>
              <th className="py-3 px-4">Approval Sign-off</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-stone-400">Loading documents...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-stone-400">No documents found in this view.</td>
              </tr>
            ) : (
              documents.map((d) => (
                <tr key={d.id} className="hover:bg-stone-50/50 transition">
                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-[#E06B53] shrink-0" />
                      <span>{d.title}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{d.category}</span>
                      {d.tags?.map((t) => (
                        <span key={t} className="px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 text-[9px] font-mono">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {d.event?.name || d.eventName || "General"}
                  </td>
                  <td className="py-3.5 px-4 text-stone-600 font-mono text-[11px]">
                    <div className="flex items-center space-x-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 font-bold text-[10px]">
                        v{d.currentVersion}
                      </span>
                      <span>• {d.fileSizeKB} KB</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        d.visibility === "shared_with_client"
                          ? "bg-blue-100 text-blue-800"
                          : d.visibility === "shared_with_vendor"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {d.visibility.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {d.approval ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1">
                          {d.approval.status === "approved" && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          )}
                          {d.approval.status === "rejected" && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center space-x-1">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Rejected</span>
                            </span>
                          )}
                          {d.approval.status === "pending" && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pending Sign-off</span>
                            </span>
                          )}
                        </div>
                        {d.approval.decidedByName && (
                          <div className="text-[10px] text-stone-500">
                            By {d.approval.decidedByName} ({new Date(d.approval.decidedAt!).toLocaleDateString()})
                          </div>
                        )}
                        <div className="text-[9px] text-stone-400 italic">
                          Recorded approval
                        </div>
                      </div>
                    ) : (
                      <span className="text-stone-400 text-[11px]">— No approval required</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                    {d.fileUrl && (
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={d.title}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-800 text-[11px] font-semibold transition"
                        title="Download / View document file"
                      >
                        <Eye className="w-3.5 h-3.5 text-stone-500" />
                        <span>View</span>
                      </a>
                    )}

                    {canManage && (
                      <button
                        onClick={() => {
                          setSelectedDoc(d);
                          setShowVersionModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-slate-800 text-[11px] font-semibold transition"
                      >
                        + Version
                      </button>
                    )}

                    {d.approval?.status === "pending" && (
                      <button
                        onClick={() => {
                          setSelectedDoc(d);
                          setShowApprovalModal(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold transition"
                      >
                        Record Decision
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: UPLOAD DOCUMENT */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-slate-900 font-serif">Upload Document Record</h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                  setFileBase64("");
                }}
                className="text-stone-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4 pt-4 text-xs">
              {/* File Dropzone / Picker */}
              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Upload File From Computer *
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
                    isDragging
                      ? "border-[#E06B53] bg-[#E06B53]/5"
                      : selectedFile
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-stone-200 hover:border-[#E06B53]/50 bg-stone-50/60"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.txt,.csv"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-between w-full px-1">
                      <div className="flex items-center space-x-2.5 text-left truncate">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs uppercase shadow-2xs">
                          {selectedFile.name.split(".").pop() || "FILE"}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-slate-900 text-xs truncate">{selectedFile.name}</p>
                          <p className="text-[10px] text-stone-400">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setFileBase64("");
                        }}
                        className="p-1.5 rounded-full text-stone-400 hover:text-rose-600 hover:bg-white transition"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center justify-center text-stone-500">
                        <Upload className="w-5 h-5 text-[#E06B53]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          Click to select a file or drag & drop here
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">
                          PDF, Word (DOCX), Excel (XLSX), images up to 25MB
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Catering Services Agreement"
                  value={upTitle}
                  onChange={(e) => setUpTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Category *
                  </label>
                  <select
                    value={upCategory}
                    onChange={(e) => setUpCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none bg-white"
                  >
                    {CATEGORIES.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                    Format
                  </label>
                  <select
                    value={upFileType}
                    onChange={(e) => setUpFileType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none bg-white"
                  >
                    <option value="PDF">PDF Document</option>
                    <option value="DOCX">Word (.docx)</option>
                    <option value="XLSX">Spreadsheet (.xlsx)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Attach to Event (Optional)
                </label>
                <select
                  value={upEventId}
                  onChange={(e) => setUpEventId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none bg-white"
                >
                  <option value="">-- General Organization Document --</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Access & Visibility Permission *
                </label>
                <select
                  value={upVisibility}
                  onChange={(e) => setUpVisibility(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none bg-white font-medium"
                >
                  <option value="internal">Internal Staff Only (Confidential)</option>
                  <option value="shared_with_client">Shared With Client Stakeholder</option>
                  <option value="shared_with_vendor">Shared With Vendor</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Legal, Executed, Catering"
                  value={upTags}
                  onChange={(e) => setUpTags(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                    setFileBase64("");
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !upTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-[#E06B53] text-white font-semibold hover:bg-[#c95841] disabled:opacity-50 flex items-center space-x-1.5 transition"
                >
                  {isUploading ? (
                    <>
                      <span className="inline-block animate-spin">⟳</span>
                      <span>Saving Document...</span>
                    </>
                  ) : (
                    <span>Save Document</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW VERSION */}
      {showVersionModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Upload New Version (Current: v{selectedDoc.currentVersion})
              </h3>
              <button
                onClick={() => {
                  setShowVersionModal(false);
                  setVersionFile(null);
                  setVersionFileBase64("");
                }}
                className="text-stone-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadNewVersion} className="space-y-4 pt-4 text-xs">
              <p className="text-stone-500">
                Replaces <strong>{selectedDoc.title}</strong> with version v{selectedDoc.currentVersion + 1}. All previous versions are archived and immutable for auditability.
              </p>

              {/* Version File Dropzone */}
              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Upload Updated File From Device
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsVersionDragging(true);
                  }}
                  onDragLeave={() => setIsVersionDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsVersionDragging(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleVersionFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => versionFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
                    isVersionDragging
                      ? "border-[#E06B53] bg-[#E06B53]/5"
                      : versionFile
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-stone-200 hover:border-[#E06B53]/50 bg-stone-50/60"
                  }`}
                >
                  <input
                    type="file"
                    ref={versionFileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleVersionFileSelect(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.txt,.csv"
                  />
                  {versionFile ? (
                    <div className="flex items-center justify-between w-full px-1">
                      <div className="flex items-center space-x-2.5 text-left truncate">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-xs uppercase shadow-2xs">
                          {versionFile.name.split(".").pop() || "FILE"}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-slate-900 text-xs truncate">{versionFile.name}</p>
                          <p className="text-[10px] text-stone-400">
                            {(versionFile.size / 1024).toFixed(1)} KB • Click to change file
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVersionFile(null);
                          setVersionFileBase64("");
                        }}
                        className="p-1.5 rounded-full text-stone-400 hover:text-rose-600 hover:bg-white transition"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-2xl bg-white border border-stone-200 shadow-2xs flex items-center justify-center text-stone-500">
                        <Upload className="w-5 h-5 text-[#E06B53]" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          Click to select new version file or drag & drop
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">
                          Attach updated version file (optional, inherits current file if omitted)
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Version Change Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Added clause 14 for live broadcast copyright licensing..."
                  value={verNotes}
                  onChange={(e) => setVerNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowVersionModal(false);
                    setVersionFile(null);
                    setVersionFileBase64("");
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingVersion || !verNotes.trim()}
                  className="px-5 py-2 rounded-xl bg-[#E06B53] text-white font-semibold hover:bg-[#c95841] disabled:opacity-50 flex items-center space-x-1.5 transition"
                >
                  {isUploadingVersion ? (
                    <>
                      <span className="inline-block animate-spin">⟳</span>
                      <span>Saving v{selectedDoc.currentVersion + 1}...</span>
                    </>
                  ) : (
                    <span>Save v{selectedDoc.currentVersion + 1}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD APPROVAL DECISION (FR-62, BR-8) */}
      {showApprovalModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Record Approval Decision
              </h3>
              <button onClick={() => setShowApprovalModal(false)} className="text-stone-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDecideApproval} className="space-y-4 pt-4 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <span className="font-bold text-slate-900">{selectedDoc.title}</span>
                <p className="text-[11px] text-stone-500">
                  Requested to: {selectedDoc.approval?.requestedToName || "Stakeholder"}
                </p>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Decision *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAppDecision("approved")}
                    className={`py-2 rounded-xl font-bold transition flex items-center justify-center space-x-1.5 ${
                      appDecision === "approved"
                        ? "bg-emerald-600 text-white"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppDecision("rejected")}
                    className={`py-2 rounded-xl font-bold transition flex items-center justify-center space-x-1.5 ${
                      appDecision === "rejected"
                        ? "bg-rose-600 text-white"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-stone-600 uppercase tracking-wider text-[10px] block mb-1">
                  Decision Comment / Sign-off Note
                </label>
                <textarea
                  rows={3}
                  placeholder="Approved on behalf of the organizing committee..."
                  value={appComment}
                  onChange={(e) => setAppComment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
                >
                  Submit Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
