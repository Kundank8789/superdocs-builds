import {
  FileText,
  Search,
  Upload,
  Sparkles,
  FileCheck2,
  Clock,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { uploadDocument } from "../services/superdocs";

function Documents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [documents, setDocuments] = useState([]);

  const fileInputRef = useRef(null);

  // Load documents from server on component mount
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("http://localhost:5000/api/documents");
        const data = await response.json();
        
        if (response.ok) {
          const formattedDocs = data.documents.map((doc, index) => ({
            id: Date.now() + index,
            name: doc.originalName || doc.filename,
            type: doc.fileType?.toUpperCase() || "FILE",
            updated: doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : "Just now",
            status: "Ready",
            statusClass: "bg-emerald-50 text-emerald-700",
            serverFilename: doc.filename,
            size: doc.size || 0,
          }));
          setDocuments(formattedDocs);
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files);

    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadedDocuments = await Promise.all(
        files.map(async (file) => {
          const result = await uploadDocument(file);

          return {
            id: Date.now() + Math.random(),
            name: result.document.originalName,
            type: file.name.split(".").pop().toUpperCase(),
            updated: "Just now",
            status: "Uploaded",
            statusClass: "bg-blue-50 text-blue-700",
            serverFilename: result.document.filename,
            size: result.document.size,
          };
        })
      );

      setDocuments((prev) => [...prev, ...uploadedDocuments]);

      console.log("Uploaded successfully:", uploadedDocuments);

      event.target.value = "";
    } catch (error) {
      console.error("Upload failed:", error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear all documents?")) {
      return;
    }

    try {
      setIsClearing(true);
      const response = await fetch("http://localhost:5000/api/clear", {
        method: "DELETE",
      });

      if (response.ok) {
        setDocuments([]);
        setAnalysisResult(null);
        setGeneratedReport(null);
        console.log("All documents cleared");
      } else {
        const data = await response.json();
        alert(data.message || "Failed to clear documents");
      }
    } catch (error) {
      console.error("Clear error:", error);
      alert("Failed to clear documents");
    } finally {
      setIsClearing(false);
    }
  };

  const handleAnalyze = async () => {
    try {
      setIsAnalyzing(true);

      const response = await fetch("http://localhost:5000/api/analyze", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Analysis failed");
      }

      setAnalysisResult(data);

      setDocuments((prev) =>
        prev.map((document) => ({
          ...document,
          status: "Ready",
          statusClass: "bg-emerald-50 text-emerald-700",
        }))
      );

      console.log("Analysis result:", data);
    } catch (error) {
      console.error("Analysis error:", error);
      alert(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);

      const response = await fetch("http://localhost:5000/api/generate", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate report");
      }

      setGeneratedReport(data.report);
    } catch (error) {
      console.error("Generate report error:", error);
      alert(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDocuments = documents.length;
  const aiReadyDocuments = documents.filter(
    (doc) => doc.status === "Ready"
  ).length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <FileText size={18} />
          <span>Events / Tech Summit 2026</span>
        </div>

        <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Documents</h1>

            <p className="mt-2 text-lg text-slate-500">
              Manage event documents and use AI to prepare your report.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClearAll}
              disabled={isClearing || documents.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={20} />
              {isClearing ? "Clearing..." : "Clear All"}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={20} />
              {isUploading ? "Uploading..." : "Upload Document"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
              accept=".pdf,.docx,.xlsx,.csv,.txt"
            />
          </div>
        </div>
      </div>

      {/* AI Assistant Card */}
      <section className="rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white shadow-lg">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-indigo-100">
              <Sparkles size={20} />
              <span className="text-sm font-semibold tracking-wide">
                AI DOCUMENT ASSISTANT
              </span>
            </div>

            <h2 className="mt-4 text-3xl font-bold">
              Turn your event documents into insights
            </h2>

            <p className="mt-3 max-w-2xl text-indigo-100">
              Upload event files and let AI help you analyze content,
              extract important information, and prepare your post-event report.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || isUploading || documents.length === 0}
              className="flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-5 font-semibold text-indigo-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Documents"}
            </button>

            <button
              onClick={handleGenerateReport}
              disabled={isGenerating || isAnalyzing || isUploading || documents.length === 0}
              className="flex items-center justify-center gap-3 rounded-2xl bg-emerald-500 px-8 py-5 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </div>
      </section>

      {/* Analysis Result Banner */}
      {analysisResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="text-lg font-bold text-emerald-800">
            Analysis Complete
          </h3>

          <p className="mt-2 text-emerald-700">
            {analysisResult.message}
          </p>

          <p className="mt-1 text-sm text-emerald-600">
            {analysisResult.totalDocuments} documents analyzed successfully.
          </p>
        </div>
      )}

      {/* Generated Report Section */}
      {generatedReport && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-600">
                Generated Report
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {generatedReport.title}
              </h2>
            </div>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
              Complete
            </span>
          </div>

          {/* Stats Cards */}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Documents</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {generatedReport.totalDocuments}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Words Analyzed</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {generatedReport.totalWords || 0}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Characters</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {generatedReport.totalCharacters || 0}
              </p>
            </div>
          </div>

          {/* AI Report Insights */}
          <div className="mt-6 space-y-5">
            {/* Executive Summary */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
              <h3 className="text-lg font-bold text-indigo-900">
                Executive Summary
              </h3>

              <p className="mt-3 leading-7 text-slate-700">
                {generatedReport.executiveSummary || "No executive summary available."}
              </p>
            </div>

            {/* Event Overview */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-bold text-slate-900">
                Event Overview
              </h3>

              <p className="mt-3 leading-7 text-slate-700">
                {generatedReport.eventOverview || "No event overview available."}
              </p>
            </div>

            {/* Key Outcomes */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-bold text-slate-900">
                Key Outcomes
              </h3>

              {generatedReport.keyOutcomes?.length > 0 ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
                  {generatedReport.keyOutcomes.map((outcome, index) => (
                    <li key={index}>{outcome}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-slate-500">No key outcomes available.</p>
              )}
            </div>

            {/* Attendance Insights */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-bold text-slate-900">
                Attendance Insights
              </h3>

              <p className="mt-3 leading-7 text-slate-700">
                {generatedReport.attendanceInsights || "No attendance insights available."}
              </p>
            </div>

            {/* Feedback Insights */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-bold text-slate-900">
                Feedback Insights
              </h3>

              <p className="mt-3 leading-7 text-slate-700">
                {generatedReport.feedbackInsights || "No feedback insights available."}
              </p>
            </div>

            {/* Financial Insights */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-bold text-slate-900">
                Financial Insights
              </h3>

              <p className="mt-3 leading-7 text-slate-700">
                {generatedReport.financialInsights || "No financial insights available."}
              </p>
            </div>

            {/* Document Conflicts */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-lg font-bold text-amber-900">
                ⚠️ Document Conflicts
              </h3>

              {generatedReport.documentConflicts?.length > 0 ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
                  {generatedReport.documentConflicts.map((conflict, index) => (
                    <li key={index}>{conflict}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-slate-600">
                  No conflicts found across the analyzed documents.
                </p>
              )}
            </div>

            {/* Recommendations */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h3 className="text-lg font-bold text-emerald-900">
                💡 Recommendations
              </h3>

              {generatedReport.recommendations?.length > 0 ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
                  {generatedReport.recommendations.map((recommendation, index) => (
                    <li key={index}>{recommendation}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-slate-600">
                  No recommendations available.
                </p>
              )}
            </div>
          </div>

          {/* Document Summaries Section */}
          <div className="mt-6">
            <h3 className="text-lg font-bold text-slate-900">
              Document Summaries
            </h3>

            <div className="mt-4 space-y-4">
              {generatedReport.documentSummaries?.map((document, index) => (
                <div
                  key={`${document.filename}-${index}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {document.filename}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {document.words} words • {document.characters} characters
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                      Analyzed
                    </span>
                  </div>

                  <p className="mt-4 whitespace-pre-line leading-7 text-slate-600">
                    {document.summary}
                  </p>
                </div>
              ))}

              {(!generatedReport.documentSummaries ||
                generatedReport.documentSummaries.length === 0) && (
                <p className="text-slate-500">
                  No document summaries available.
                </p>
              )}
            </div>
          </div>

          <p className="mt-6 text-sm text-slate-400">
            Generated: {new Date(generatedReport.generatedAt).toLocaleString()}
          </p>
        </section>
      )}

      {/* Search + Stats */}
      <section className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 shadow-sm">
          <Search size={21} className="text-slate-400" />

          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border-0 py-4 text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div>
            <p className="text-sm text-slate-500">Total Documents</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {totalDocuments}
            </p>
          </div>

          <div className="h-10 w-px bg-slate-200" />

          <div>
            <p className="text-sm text-slate-500">AI Ready</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {aiReadyDocuments}
            </p>
          </div>
        </div>
      </section>

      {/* Document List */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Event Documents
            </h2>

            <p className="mt-1 text-slate-500">
              {isLoading ? "Loading..." : `${documents.length} documents available for AI analysis.`}
            </p>
          </div>

          <span className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
            {filteredDocuments.length} Files
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="px-8 py-12 text-center text-slate-500">
              Loading documents...
            </div>
          ) : filteredDocuments.length > 0 ? (
            filteredDocuments.map((document) => (
              <div
                key={document.id}
                className="flex flex-col gap-4 px-8 py-6 transition hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <FileText size={24} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-800">
                      {document.name}
                    </h3>

                    <div className="mt-1 flex items-center gap-3 text-sm text-slate-500">
                      <span>{document.type}</span>

                      <span className="h-1 w-1 rounded-full bg-slate-300" />

                      <span>{document.updated}</span>

                      {document.size && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-slate-300" />
                          <span>
                            {(document.size / 1024).toFixed(1)} KB
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <span
                    className={`rounded-full px-3 py-1.5 text-sm font-medium ${document.statusClass}`}
                  >
                    {document.status}
                  </span>

                  <button className="text-slate-400 transition hover:text-slate-700">
                    <MoreHorizontal size={22} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="px-8 py-12 text-center text-slate-500">
              No documents uploaded yet. Click "Upload Document" to get started.
            </div>
          )}
        </div>
      </section>

      {/* AI Workflow Info */}
      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Upload size={23} />
          </div>

          <h3 className="mt-5 text-lg font-bold text-slate-800">1. Upload</h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Add event reports, feedback, sponsor documents, and other files.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Sparkles size={23} />
          </div>

          <h3 className="mt-5 text-lg font-bold text-slate-800">2. Analyze</h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            AI processes your documents and extracts useful event insights.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <FileCheck2 size={23} />
          </div>

          <h3 className="mt-5 text-lg font-bold text-slate-800">3. Generate</h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Use the extracted information to generate your impact report.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Documents;