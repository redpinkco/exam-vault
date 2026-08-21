export default async function handler(req: any, res: any) {
  // รับเฉพาะคำสั่งแบบ POST เท่านั้น
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // รับข้อมูลคำถามและโมเดล
    const { contents, model = "gemini-1.5-flash" } = req.body;
    
    // ✅ แก้ TypeScript Error ตรงนี้ (ใช้วงเล็บก้ามปู)
    const apiKey = process.env['GEMINI_API_KEY'];

    if (!apiKey) {
      return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบ" });
    }

    // ส่งคำขอไปหา Google
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "x-goog-api-key": apiKey 
      },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();
    return res.status(200).json(data); 
    
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: "เกิดข้อผิดพลาดในการประมวลผล AI" });
  }
}