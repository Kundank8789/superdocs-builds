import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import XLSX from "xlsx";
import Groq from "groq-sdk";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Uploads folder
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Track uploaded files (in-memory)
let uploadedFiles = [];

// Clear uploads folder on server start
if (fs.existsSync(uploadDir)) {
  const files = fs.readdirSync(uploadDir);
  for (const file of files) {
    const filePath = path.join(uploadDir, file);
    fs.unlinkSync(filePath);
  }
  uploadedFiles = []; // Clear tracked files
  console.log(`Cleared ${files.length} files from uploads folder`);
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// ============ HELPER FUNCTIONS ============

// Clean extracted text
const cleanText = (text = "") => {
  return text.replace(/\s+/g, " ").trim();
};

// Find useful event metrics from uploaded documents
const extractEventMetrics = (text) => {
  const metrics = {
    attendance: null,
    sessions: null,
    satisfaction: null,
    budget: null,
    sponsors: null,
  };

  const attendanceMatch = text.match(
    /(?:attended by|attendance|participants?|attendees?)\s*(?:of|:)?\s*(\d+)/i
  );

  const sessionsMatch = text.match(
    /(\d+)\s+(?:sessions?|workshops?|talks?)/i
  );

  const satisfactionMatch = text.match(
    /(?:satisfaction|satisfaction score|attendee satisfaction)[^\d]{0,30}(\d{1,3})%/i
  );

  const budgetMatch = text.match(
    /(?:budget|spend|cost|expenses?)[^\d$₹]{0,30}([$₹]?\s?[\d,]+)/i
  );

  const sponsorMatch = text.match(
    /(\d+)\s+(?:sponsors?|sponsorships?)/i
  );

  if (attendanceMatch) metrics.attendance = Number(attendanceMatch[1]);
  if (sessionsMatch) metrics.sessions = Number(sessionsMatch[1]);
  if (satisfactionMatch) metrics.satisfaction = Number(satisfactionMatch[1]);
  if (budgetMatch) metrics.budget = budgetMatch[1];
  if (sponsorMatch) metrics.sponsors = Number(sponsorMatch[1]);

  return metrics;
};

// Extract important findings from document content
const extractKeyFindings = (text) => {
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30);

  return sentences
    .filter((sentence) =>
      /success|satisfaction|feedback|attendee|participant|impact|result|performance|growth|increase|improve|excellent|practical|networking/i.test(
        sentence
      )
    )
    .slice(0, 5);
};

// Extract attendee feedback / quotes
const extractFeedback = (text) => {
  const quotes = text.match(/["“][^"”]{10,250}["”]/g) || [];

  return [...new Set(quotes)].slice(0, 5);
};

// ============ API ROUTES ============

// Test API
app.get("/", (req, res) => {
  res.json({
    message: "ImpactFlow API is running",
  });
});

// Get all uploaded documents
app.get("/api/documents", (req, res) => {
  res.status(200).json({
    documents: uploadedFiles,
  });
});

// Upload document
app.post("/api/upload", upload.single("document"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      message: "No document uploaded",
    });
  }

  // Check if file already exists in memory
  const existingFile = uploadedFiles.find(
    (file) => file.originalName === req.file.originalname
  );

  if (existingFile) {
    // Remove the physical file
    fs.unlinkSync(path.join(uploadDir, req.file.filename));
    return res.status(400).json({
      message: `File "${req.file.originalname}" already exists. Please upload a different file.`,
    });
  }

  // Add to tracked files
  uploadedFiles.push({
    filename: req.file.filename,
    originalName: req.file.originalname,
    uploadedAt: new Date().toISOString(),
  });

  res.status(200).json({
    message: "Document uploaded successfully",
    document: {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      status: "Processing",
    },
  });
});

// Clear all uploaded documents
app.delete("/api/clear", (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir);
    
    let clearedCount = 0;
    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      fs.unlinkSync(filePath);
      clearedCount++;
    }
    
    uploadedFiles = []; // Clear tracked files
    
    res.status(200).json({
      message: "All documents cleared successfully",
      clearedCount,
    });
  } catch (error) {
    console.error("Clear error:", error);
    res.status(500).json({
      message: "Failed to clear documents",
      error: error.message,
    });
  }
});

// Analyze uploaded documents
app.post("/api/analyze", async (req, res) => {
  try {
    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        message: "No documents available for analysis",
      });
    }

    const documents = [];

    for (const trackedFile of uploadedFiles) {
      const filename = trackedFile.filename;
      const filePath = path.join(uploadDir, filename);
      
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const extension = path.extname(filename).toLowerCase();

      let extractedText = "";
      let metadata = {};

      // Analyze PDF files
      if (extension === ".pdf") {
        try {
          const fileBuffer = fs.readFileSync(filePath);

          const parser = new PDFParse({
            data: fileBuffer,
          });

          const pdfData = await parser.getText();

          extractedText = pdfData.text;

          metadata = {
            pages: pdfData.numpages || 0,
            info: pdfData.info || {},
          };

          await parser.destroy();
        } catch (pdfError) {
          console.error(`Error parsing PDF ${filename}:`, pdfError);
          extractedText = `Error parsing PDF file: ${pdfError.message}`;
        }
      }

      // Analyze TXT files
      else if (extension === ".txt") {
        try {
          extractedText = fs.readFileSync(filePath, "utf8");

          metadata = {
            type: "Text Document",
          };
        } catch (textError) {
          console.error(`Error reading TXT ${filename}:`, textError);
          extractedText = `Error reading TXT file: ${textError.message}`;
        }
      }

      // Analyze DOCX files
      else if (extension === ".docx") {
        try {
          const result = await mammoth.extractRawText({
            path: filePath,
          });

          extractedText = result.value || "";

          metadata = {
            type: "DOCX",
          };
        } catch (docxError) {
          console.error(`Error parsing DOCX ${filename}:`, docxError);
          extractedText = `Error parsing DOCX file: ${docxError.message}`;
        }
      }

      // Analyze XLSX / XLS files
      else if (extension === ".xlsx" || extension === ".xls") {
        try {
          const workbook = XLSX.readFile(filePath);

          const sheetData = [];

          for (const sheetName of workbook.SheetNames) {
            const worksheet = workbook.Sheets[sheetName];

            const sheetText = XLSX.utils.sheet_to_csv(worksheet);

            sheetData.push(`Sheet: ${sheetName}\n${sheetText}`);
          }

          extractedText = sheetData.join("\n\n");

          metadata = {
            type: "Excel",
            sheets: workbook.SheetNames,
          };
        } catch (excelError) {
          console.error(`Error parsing Excel ${filename}:`, excelError);
          extractedText = `Error parsing Excel file: ${excelError.message}`;
        }
      }

      else {
        extractedText = "This file type is currently not supported for analysis.";
        metadata = {
          type: "Unsupported",
        };
      }

      documents.push({
        filename: trackedFile.originalName || filename,
        status: "Ready",
        extractedText,
        preview: extractedText
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 500),
        fileSize: fs.statSync(filePath).size,
        fileType: extension,
        metadata,
      });
    }

    res.status(200).json({
      message: "Documents analyzed successfully",
      totalDocuments: documents.length,
      documents,
    });
  } catch (error) {
    console.error("Analysis error:", error);

    res.status(500).json({
      message: "Failed to analyze documents",
      error: error.message,
    });
  }
});

// Generate report from uploaded documents
app.post("/api/generate", async (req, res) => {
  try {
    if (uploadedFiles.length === 0) {
      return res.status(400).json({
        message: "No documents available to generate a report",
      });
    }

    const extractedDocuments = [];

    for (const trackedFile of uploadedFiles) {
      const filename = trackedFile.filename;
      const filePath = path.join(uploadDir, filename);
      
      if (!fs.existsSync(filePath)) {
        continue;
      }

      const extension = path.extname(filename).toLowerCase();

      let extractedText = "";

      try {
        // PDF
        if (extension === ".pdf") {
          const fileBuffer = fs.readFileSync(filePath);

          const parser = new PDFParse({
            data: fileBuffer,
          });

          const pdfData = await parser.getText();
          extractedText = pdfData.text;

          await parser.destroy();
        }

        // TXT
        else if (extension === ".txt") {
          extractedText = fs.readFileSync(filePath, "utf8");
        }

        // DOCX
        else if (extension === ".docx") {
          const result = await mammoth.extractRawText({
            path: filePath,
          });

          extractedText = result.value || "";
        }

        // XLSX / XLS
        else if (extension === ".xlsx" || extension === ".xls") {
          const workbook = XLSX.readFile(filePath);

          extractedText = workbook.SheetNames.map((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];

            return `Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(
              worksheet
            )}`;
          }).join("\n\n");
        }

        // Skip unsupported files
        else {
          continue;
        }

        if (extractedText.trim()) {
          const cleanedDocumentText = cleanText(extractedText);

          extractedDocuments.push({
            filename: trackedFile.originalName || filename,
            fileType: extension,
            text: cleanedDocumentText,
            words: cleanedDocumentText.split(/\s+/).filter(Boolean).length,
            characters: cleanedDocumentText.length,
          });
        }
      } catch (fileError) {
        console.error(`Error reading ${filename}:`, fileError);
      }
    }

    if (extractedDocuments.length === 0) {
      return res.status(400).json({
        message: "No readable documents available",
      });
    }

    // Combine ALL supported documents
    const combinedText = extractedDocuments
      .map(
        (document) =>
          `DOCUMENT: ${document.filename}\n${document.text}`
      )
      .join("\n\n");

    const cleanedCombinedText = cleanText(combinedText);

    const totalWords = cleanedCombinedText
      .split(/\s+/)
      .filter(Boolean).length;

    // Extract metrics for context
    const metrics = extractEventMetrics(cleanedCombinedText);
    const keyFindings = extractKeyFindings(cleanedCombinedText);
    const attendeeFeedback = extractFeedback(cleanedCombinedText);

    // Build the prompt for Groq
    const prompt = `
You are an expert event analyst. Create a comprehensive post-event impact report based on the following document content.

Document Content:
${cleanedCombinedText.substring(0, 8000)}

Extracted Metrics:
- Attendance: ${metrics.attendance || 'Not found'}
- Sessions: ${metrics.sessions || 'Not found'}
- Satisfaction: ${metrics.satisfaction || 'Not found'}%
- Budget: ${metrics.budget || 'Not found'}
- Sponsors: ${metrics.sponsors || 'Not found'}

Key Findings:
${keyFindings.map(f => `- ${f}`).join('\n')}

Attendee Feedback:
${attendeeFeedback.map(f => `- ${f}`).join('\n')}

Generate a detailed report in JSON format with the following structure:
{
  "executiveSummary": "A brief 2-3 sentence overview of the event's overall success and key takeaways.",
  "eventOverview": "A paragraph describing the event scope, goals, and general outcomes.",
  "keyOutcomes": ["Outcome 1", "Outcome 2", "Outcome 3"],
  "attendanceInsights": "Analysis of attendance numbers, trends, and any notable patterns.",
  "feedbackInsights": "Analysis of attendee feedback, satisfaction scores, and key themes.",
  "financialInsights": "Analysis of budget, spending, and financial performance.",
  "documentConflicts": ["Any conflicting information found across documents", "Or empty array if none"],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}

Make the insights specific to the event content provided. If certain data is not available, acknowledge that in the analysis.
Return ONLY valid JSON, no markdown or other text.
`;

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert event analyst who creates detailed, insightful post-event reports. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "openai/gpt-oss-20b",
      temperature: 0.3,
      max_tokens: 4000,
    });

    // Get AI response
    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("AI did not return a report");
    }

    // Clean JSON in case AI returns markdown code fences
    const cleanedAIResponse = aiResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let aiReport;

    try {
      aiReport = JSON.parse(cleanedAIResponse);
    } catch (parseError) {
      console.error("AI response was not valid JSON:", aiResponse);
      throw new Error("Failed to parse AI-generated report");
    }

    // Create final report
    const report = {
      title: "Post-Event Impact Report",
      generatedAt: new Date().toISOString(),

      totalDocuments: extractedDocuments.length,

      totalWords,
      totalCharacters: cleanedCombinedText.length,

      executiveSummary: aiReport.executiveSummary,

      eventOverview: aiReport.eventOverview,

      keyOutcomes: aiReport.keyOutcomes || [],

      attendanceInsights: aiReport.attendanceInsights,

      feedbackInsights: aiReport.feedbackInsights,

      financialInsights: aiReport.financialInsights,

      documentConflicts: aiReport.documentConflicts || [],

      recommendations: aiReport.recommendations || [],

      // Keep individual document information
      documentSummaries: extractedDocuments.map((doc) => ({
        filename: doc.filename,
        fileType: doc.fileType,
        summary: doc.text.substring(0, 500),
        words: doc.words,
        characters: doc.characters,
      })),
    };

    res.status(200).json({
      message: "Report generated successfully",
      report,
    });
  } catch (error) {
    console.error("Report generation error:", error);

    res.status(500).json({
      message: "Failed to generate report",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});