import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs";
import requireAuth from "../../../lib/requireAuth";
import requireRole from "../../../lib/requireRole";

export const config = {
  api: { bodyParser: false },
};

// Validate Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && SUPABASE_URL.startsWith("http")) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  } catch (err) {
    console.error("Supabase initialization error:", err);
    supabase = null;
  }
}

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // Check if Supabase is configured
  if (!supabase) {
    return res.status(503).json({ 
      error: "File upload service not configured. Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables." 
    });
  }

  const form = formidable();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Formidable parse error:", err);
      return res.status(500).json({ error: err.message });
    }

    const batchId = Array.isArray(fields.batchId) 
      ? fields.batchId[0] 
      : fields.batchId;
    
    const file = Array.isArray(files.file) 
      ? files.file[0] 
      : files.file;

    if (!batchId || !file) {
      return res.status(400).json({ error: "batchId and file required" });
    }

    if (!file.filepath) {
      return res.status(400).json({ error: "Invalid file upload" });
    }

    try {
      const buffer = fs.readFileSync(file.filepath);
      const filename = `dispatch_${batchId}_${Date.now()}_${file.originalFilename || 'dispatch-image'}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("dispatch-images")
        .upload(filename, buffer, {
          contentType: file.mimetype || 'image/jpeg',
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        // Clean up temp file before returning error
        try {
          fs.unlinkSync(file.filepath);
        } catch (cleanupError) {
          console.error("Error cleaning up temp file:", cleanupError);
        }
        return res.status(500).json({ 
          error: uploadError.message || "Failed to upload image to storage" 
        });
      }

      const { data: urlData } = supabase.storage
        .from("dispatch-images")
        .getPublicUrl(filename);

      // Clean up temporary file
      try {
        fs.unlinkSync(file.filepath);
      } catch (cleanupError) {
        console.error("Error cleaning up temp file:", cleanupError);
      }

      return res.json({ imageUrl: urlData.publicUrl });
    } catch (error) {
      console.error("File processing error:", error);
      // Clean up temp file on error
      try {
        if (file?.filepath) {
          fs.unlinkSync(file.filepath);
        }
      } catch (cleanupError) {
        console.error("Error cleaning up temp file:", cleanupError);
      }
      return res.status(500).json({ error: "Error processing file upload" });
    }
  });
}

export default requireAuth(requireRole(["OPS", "ADMIN"], handler));

