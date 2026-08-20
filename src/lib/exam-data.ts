export type ProgramId = "ep" | "ism" | "regular";

export type Program = {
  id: ProgramId;
  name: string;
  fullName: string;
  tagline: string;
  subjects: string[];
};

export const PROGRAMS: Record<ProgramId, Program> = {
  ep: {
    id: "ep",
    name: "EP",
    fullName: "English Program",
    tagline: "เน้นการเรียนการสอนภาษาอังกฤษเข้มข้นทุกวิชา",
    subjects: ["อังกฤษ", "วิทย์", "คณิต", "ภาษาไทย", "ทักษะการใช้ภาษาอังกฤษ"],
  },
  ism: {
    id: "ism",
    name: "ISM",
    fullName: "Intensive Science-Mathematics",
    tagline: "เข้มข้นด้านคณิตศาสตร์และวิทยาศาสตร์",
    subjects: ["คณิต", "วิทย์", "อังกฤษ", "ภาษาไทย", "ความถนัดด้านคณิตศาสตร์"],
  },
  regular: {
    id: "regular",
    name: "ภาคธรรมดา",
    fullName: "Regular Program",
    tagline: "หลักสูตรพื้นฐานครบทุกกลุ่มสาระ",
    subjects: ["อังกฤษ", "วิทย์", "คณิต", "ภาษาไทย", "สังคม"],
  },
};

export const YEARS = [2566, 2565, 2564, 2563, 2562, 2561, 2560];

export type Paper = {
  id: string;
  program: ProgramId;
  subject: string;
  year: number;
  questions: number;
  minutes: number;
};

export function getPapers(program: ProgramId): Paper[] {
  const p = PROGRAMS[program];
  const papers: Paper[] = [];
  for (const year of YEARS) {
    for (const subject of p.subjects) {
      papers.push({
        id: `${program}-${subject}-${year}`,
        program,
        subject,
        year,
        questions: 50,
        minutes: 90,
      });
    }
  }
  return papers;
}

export function isProgramId(value: string): value is ProgramId {
  return value === "ep" || value === "ism" || value === "regular";
}

export type Question = {
  number: number;
  text: string;
  type: "choice" | "fill";
  hasImage: boolean;
};

const CHOICE_STEMS = [
  "ผลลัพธ์ของนิพจน์ต่อไปนี้มีค่าเท่ากับข้อใด",
  "จากรูปที่กำหนดให้ ข้อใดกล่าวถูกต้อง",
  "ข้อใดเป็นข้อสรุปที่สมเหตุสมผลที่สุด",
  "ข้อใดมีความหมายใกล้เคียงกับข้อความที่ขีดเส้นใต้",
  "จากตารางข้อมูล ค่าที่หายไปคือข้อใด",
];

export function buildQuestions(count: number): Question[] {
  return Array.from({ length: count }, (_, i) => {
    const number = i + 1;
    const type: Question["type"] = number % 7 === 0 ? "fill" : "choice";
    return {
      number,
      type,
      text:
        type === "fill"
          ? `เติมคำตอบที่ถูกต้องลงในช่องว่าง (ข้อ ${number}) โดยแสดงคำตอบเป็นตัวเลขหรือคำตอบสั้น`
          : `${CHOICE_STEMS[i % CHOICE_STEMS.length]} (ข้อ ${number})`,
      hasImage: number % 4 === 0,
    };
  });
}

export const CHOICE_LABELS = ["ก", "ข", "ค", "ง"];
