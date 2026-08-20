# Exam Vault UI

Act as an expert UI/UX designer and Frontend Developer. Build a comprehensive user flow for an EdTech app named "คลังสอบ" (Exam Vault). The UI must be modern, clean, stress-free, and support the Thai language.

[Global Branding & Header]

- App Name: "คลังสอบ"

- Logo: Create a minimalist, modern logo placeholder depicting a "bookshelf full of books" to visually represent a massive archive of past exams.

- Header: Include the logo, app name, and a user profile avatar. Present on all screens.

[Screen 1: Grade Selection (Home)]

- Main Title: "เลือกชั้นเรียนของคุณ" (Select your grade)

- Content: 

  - A prominent, active primary card for "ป.6 (สอบเข้า ม.1)" - Grade 6 Entrance Exam.

  - Two inactive/grayed-out cards for "ป.4" and "ป.5" with a "Coming Soon" badge. This shows users that the platform will scale in the future.

[Screen 2: Program Selection (After clicking ป.6)]

- Main Title: "เลือกแผนการเรียนที่คุณต้องการสอบเข้า" (Which program are you preparing for?)

- Content: 3 large, clickable cards with modern icons:

  1. "EP (English Program)": Badges -> อังกฤษ, วิทย์, คณิต, ภาษาไทย, ทักษะการใช้ภาษาอังกฤษ.

  2. "ISM (Intensive Science-Mathematics)": Badges -> คณิต, วิทย์, อังกฤษ, ภาษาไทย, ความถนัดด้านคณิตศาสตร์.

  3. "ภาคธรรมดา (Regular Program)": Badges -> อังกฤษ, วิทย์, คณิต, ภาษาไทย, สังคม.

[Screen 3: Subject & Exam Hub]

- Header: Breadcrumb navigation (e.g., "ป.6 > เตรียมสอบ ISM").

- Content:

  - Tabs or a Grid showing ONLY the specific subjects relevant to the selected program.

  - "ข้อสอบเก่า (Past Papers)" section with dropdown filters for "Year (e.g., 2560 - 2566)" and "Subject".

  - A "Start Exam" button next to each listed paper.

[Screen 4: Virtual Exam Room]

- Top Bar (Sticky): Show Exam Title (e.g., "คณิตศาสตร์ ISM ปี 2565"), a prominent Countdown Timer (e.g., "01:30:00"), and a "Submit" button.

- Question Area: A clean card displaying the question number, text, and an image placeholder (for math graphs/science diagrams).

- Answer Area:

  - Multiple Choice Component: 4 large, tap-friendly buttons (ก, ข, ค, ง). Active state must have a clear border/color highlight.

  - Fill-in-the-blank Component: A clean text input field.

- Bottom Bar / Sidebar: A "Progress Map" showing numbers 1 to 50. Highlight answered questions in green and skipped questions in gray. Include "Previous" and "Next" buttons.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b3ebe979-33cb-47d7-9f1c-3ee2a2adc2a3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
