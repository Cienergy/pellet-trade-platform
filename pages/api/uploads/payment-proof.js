import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs";
import requireAuth from "../../../lib/requireAuth";

export const config = {
  api: { bodyParser: false },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const form = formidable();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Formidable parse error:", err);
      return res.status(500).json({ error: err.message });
    }

    // Handle both array and single value formats
    const invoiceId = Array.isArray(fields.invoiceId) 
      ? fields.invoiceId[0] 
      : fields.invoiceId;
    
    const file = Array.isArray(files.file) 
      ? files.file[0] 
      : files.file;

    if (!invoiceId || !file) {
      console.error("Missing invoiceId or file", { invoiceId, file });
      return res.status(400).json({ error: "invoiceId and file required" });
    }

    // Check if filepath exists
    if (!file.filepath) {
      console.error("File filepath is undefined", file);
      return res.status(400).json({ error: "Invalid file upload" });
    }

    try {
      const buffer = fs.readFileSync(file.filepath);
      const filename = `invoice_${invoiceId}_${Date.now()}_${file.originalFilename || 'payment-proof'}`;

      const { error: uploadError } = await supabase.storage
        .from("payment-proof")
        .upload(filename, buffer, {
          contentType: file.mimetype || 'application/octet-stream',
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return res.status(500).json({ error: uploadError.message });
      }

      const { data } = supabase.storage
        .from("payment-proof")
        .getPublicUrl(filename);

      // Clean up temporary file
      try {
        fs.unlinkSync(file.filepath);
      } catch (cleanupError) {
        console.error("Error cleaning up temp file:", cleanupError);
        // Don't fail the request if cleanup fails
      }

      return res.json({ proofUrl: data.publicUrl });
    } catch (error) {
      console.error("File processing error:", error);
      return res.status(500).json({ error: "Error processing file upload" });
    }
  });
}

export default requireAuth(handler);