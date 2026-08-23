export default async function handler(req: any, res: any) {
  // รับเฉพาะคำสั่งแบบ POST เท่านั้น
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { contents, model = "gemini-3.6-flash" } = req.body;

    const apiKey = process.env['GEMINI_API_KEY'];

    if (!apiKey) {
      return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบ" });
    }

    if (!contents) {
      return res.status(400).json({ error: "ข้อมูล contents จำเป็นต้องระบุ" });
    }

    // ส่งคำขอไปยัง Google Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({ contents }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Google Gemini API Error:", data);
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Internal Server API Error:", error);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ขณะประมวลผล AI" });
  }
}