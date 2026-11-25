import { NextRequest, NextResponse } from 'next/server';
import { AcademicHoliday } from '@/types';

// Standard months mapping
const MONTHS: Record<string, string> = {
  january: '01',
  jan: '01',
  february: '02',
  feb: '02',
  march: '03',
  mar: '03',
  april: '04',
  apr: '04',
  may: '05',
  june: '06',
  jun: '06',
  july: '07',
  jul: '07',
  august: '08',
  aug: '08',
  september: '09',
  sep: '09',
  sept: '09',
  october: '10',
  oct: '10',
  november: '11',
  nov: '11',
  december: '12',
  dec: '12',
};

// Known common academic holidays for title refinement
const KNOWN_HOLIDAY_KEYWORDS = [
  'republic day',
  'independence day',
  'mahatma gandhi',
  'gandhi jayanti',
  'diwali',
  'deepavali',
  'holi',
  'good friday',
  'easter',
  'eid',
  'id-ul',
  'id-ul-fitr',
  'bakrid',
  'id-ul-zuha',
  'muharram',
  'dussehra',
  'vijayadashami',
  'durga puja',
  'christmas',
  'new year',
  'buddha purnima',
  'mahavir jayanti',
  'guru nanak',
  'raksha bandhan',
  'janmashtami',
  'krishna janmashtami',
  'maha shivratri',
  'shivratri',
  'ram navami',
  'goverdhan puja',
  'bhai dooj',
  'chath puja',
  'summer vacation',
  'winter vacation',
  'semester break',
  'autumn break',
  'national holiday',
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Please upload a PDF file' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Import pdf-parse
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');

    let parsedText = '';
    try {
      const data = await pdfParse(buffer);
      parsedText = data.text || '';
    } catch (parseErr: any) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not parse PDF text: ${parseErr?.message || 'Invalid or encrypted PDF file'}`,
        },
        { status: 422 }
      );
    }

    if (!parsedText || parsedText.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'The uploaded PDF appears to be a scanned image without a text layer. Please use a text-based PDF or enter dates manually.',
        },
        { status: 400 }
      );
    }

    // Heuristic Line-by-Line & Regex Extraction
    const lines = parsedText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const extractedHolidays: Array<Omit<AcademicHoliday, 'id' | 'createdAt'>> = [];
    const seenDates = new Set<string>();

    const defaultYear = new Date().getFullYear();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Pattern 1: DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD
      const numericDateRegex = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b|\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/;
      const numMatch = line.match(numericDateRegex);

      // Pattern 2: DD (st/nd/rd/th) Month (YYYY) or Month DD, (YYYY)
      const textDateRegex = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?\b|\b([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i;
      const textMatch = line.match(textDateRegex);

      let parsedDate: string | null = null;
      let matchedSubstring = '';

      if (numMatch) {
        matchedSubstring = numMatch[0];
        if (numMatch[1] && numMatch[2] && numMatch[3]) {
          // DD-MM-YYYY or MM-DD-YYYY
          let day = parseInt(numMatch[1], 10);
          let month = parseInt(numMatch[2], 10);
          let year = parseInt(numMatch[3], 10);
          if (year < 100) year += 2000;
          if (day > 12 && month <= 12) {
            // Unambiguous DD-MM-YYYY
            parsedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          } else if (month > 12 && day <= 12) {
            // Swapped MM-DD-YYYY
            parsedDate = `${year}-${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`;
          } else {
            // Standard Indian academic standard is DD-MM-YYYY
            parsedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          }
        } else if (numMatch[4] && numMatch[5] && numMatch[6]) {
          // YYYY-MM-DD
          parsedDate = `${numMatch[4]}-${String(numMatch[5]).padStart(2, '0')}-${String(numMatch[6]).padStart(2, '0')}`;
        }
      } else if (textMatch) {
        matchedSubstring = textMatch[0];
        let day = 0;
        let monthStr = '';
        let year = defaultYear;

        if (textMatch[1] && textMatch[2]) {
          day = parseInt(textMatch[1], 10);
          monthStr = textMatch[2].toLowerCase();
          if (textMatch[3]) year = parseInt(textMatch[3], 10);
        } else if (textMatch[4] && textMatch[5]) {
          monthStr = textMatch[4].toLowerCase();
          day = parseInt(textMatch[5], 10);
          if (textMatch[6]) year = parseInt(textMatch[6], 10);
        }

        const monthNum = MONTHS[monthStr] || MONTHS[monthStr.substring(0, 3)];
        if (monthNum && day >= 1 && day <= 31) {
          parsedDate = `${year}-${monthNum}-${String(day).padStart(2, '0')}`;
        }
      }

      if (parsedDate && !seenDates.has(parsedDate)) {
        // Find title from line remainder or adjacent line
        let remainder = line.replace(matchedSubstring, '').replace(/[-–—:|]/g, ' ').trim();
        // Remove day names (Monday, Tuesday, etc.)
        remainder = remainder.replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi, '').trim();

        // If remainder is empty or very short, check next line
        if (remainder.length < 3 && i + 1 < lines.length) {
          const next = lines[i + 1].trim();
          if (!next.match(numericDateRegex) && !next.match(textDateRegex)) {
            remainder = next;
          }
        }

        // Clean up title
        let cleanTitle = remainder.replace(/^[\d\s\.\,\-]+/, '').trim();
        if (!cleanTitle || cleanTitle.length < 2) {
          // Check if any known holiday keyword appears in nearby lines
          const windowText = [lines[Math.max(0, i - 1)], line, lines[Math.min(lines.length - 1, i + 1)]].join(' ').toLowerCase();
          const foundKeyword = KNOWN_HOLIDAY_KEYWORDS.find((k) => windowText.includes(k));
          cleanTitle = foundKeyword
            ? foundKeyword.replace(/\b\w/g, (c) => c.toUpperCase())
            : `University Declared Holiday`;
        }

        // Infer type (gazetted vs restricted vs vacation)
        const lowerTitle = cleanTitle.toLowerCase();
        let holidayType: AcademicHoliday['type'] = 'gazetted';
        if (lowerTitle.includes('restricted') || lowerTitle.includes('rh') || lowerTitle.includes('optional')) {
          holidayType = 'restricted';
        } else if (lowerTitle.includes('vacation') || lowerTitle.includes('break') || lowerTitle.includes('recess')) {
          holidayType = 'vacation';
        } else if (lowerTitle.includes('exam')) {
          holidayType = 'exam';
        }

        seenDates.add(parsedDate);
        extractedHolidays.push({
          title: cleanTitle.substring(0, 80),
          date: parsedDate,
          type: holidayType,
          description: `Extracted from uploaded academic calendar: ${file.name}`,
          academicYear: `${defaultYear}-${defaultYear + 1}`,
        });
      }
    }

    // Sort extracted holidays chronologically
    extractedHolidays.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      count: extractedHolidays.length,
      fileName: file.name,
      extracted: extractedHolidays,
      rawSnippet: parsedText.substring(0, 300),
    });
  } catch (err: any) {
    console.error('PDF parsing error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error while parsing PDF' },
      { status: 500 }
    );
  }
}
