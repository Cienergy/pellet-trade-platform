import { createClient } from "@supabase/supabase-js";
import formidable from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const form = formidable();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    const invoiceId = fields.invoiceId;
    const file = files.file;

    if (!invoiceId || !file) {
      return res.status(400).json({ error: "invoiceId and file required" });
    }

    const buffer = fs.readFileSync(file.filepath);
    const filename = `invoice_${invoiceId}_${Date.now()}_${file.originalFilename}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-proof")
      .upload(filename, buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) {
      return res.status(500).json(uploadError);
    }

    const { data } = supabase.storage
      .from("payment-proof")
      .getPublicUrl(filename);

    return res.json({ proofUrl: data.publicUrl });
  });
}
