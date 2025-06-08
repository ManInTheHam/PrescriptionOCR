import { type NextRequest, NextResponse } from "next/server"

// Helper function to introduce realistic OCR errors that look like model output
function introduceRealisticOCRErrors(text: string): string {
  const errorRate = 0.15 // 15% error rate for more realistic OCR

  // Common OCR character confusions
  const ocrErrors = {
    // Number/letter confusions
    O: "0",
    "0": "O",
    I: "1",
    "1": "I",
    l: "1",
    "1": "l",
    S: "5",
    "5": "S",
    B: "8",
    "8": "B",
    G: "6",
    "6": "G",
    Z: "2",
    "2": "Z",
    q: "9",
    "9": "q",

    // Similar letter confusions
    m: "n",
    n: "m",
    u: "v",
    v: "u",
    c: "e",
    e: "c",
    a: "o",
    o: "a",
    h: "b",
    b: "h",
    p: "q",
    q: "p",
    r: "n",
    n: "r",
    f: "t",
    t: "f",
    i: "j",
    j: "i",

    // Case confusions
    C: "c",
    c: "C",
    P: "p",
    p: "P",
    K: "k",
    k: "K",
    V: "v",
    v: "V",
    W: "w",
    w: "W",
    X: "x",
    x: "X",
    Y: "y",
    y: "Y",
    Z: "z",
    z: "Z",
  }

  let result = ""
  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    // Randomly introduce errors
    if (Math.random() < errorRate) {
      if (ocrErrors[char]) {
        result += ocrErrors[char]
      } else if (Math.random() < 0.3) {
        // Sometimes skip characters (common OCR issue)
        continue
      } else if (Math.random() < 0.2) {
        // Sometimes duplicate characters
        result += char + char
      } else {
        result += char
      }
    } else {
      result += char
    }
  }

  return result
}

// Function to add OCR-style formatting issues
function addOCRFormattingIssues(text: string): string {
  let result = text

  // Add random line breaks in wrong places (OCR scanning issue)
  result = result.replace(/(\w+)\s+(\w+)/g, (match, word1, word2) => {
    if (Math.random() < 0.1) {
      return `${word1}\n${word2}`
    }
    return match
  })

  // Remove some spaces (OCR often misses spaces)
  result = result.replace(/\s+/g, (match) => {
    if (Math.random() < 0.15) {
      return ""
    }
    return match
  })

  // Add extra spaces randomly
  result = result.replace(/(\w)/g, (match) => {
    if (Math.random() < 0.08) {
      return match + " "
    }
    return match
  })

  return result
}

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 })
    }

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 })
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `You are simulating a basic OCR model output. Extract text from this prescription image with typical OCR limitations and errors.

CRITICAL REQUIREMENTS:
- ONLY extract English text, ignore any other languages completely
- Make the output look like raw OCR model results, not polished text
- Include typical OCR errors: character misrecognition, spacing issues, line break problems
- Don't be too smart about context - OCR models are literal
- Include some garbled text and unclear sections
- Make medication names sometimes partially incorrect
- Don't format nicely - keep it raw and messy like real OCR

Provide the response in this exact JSON format:
{
  "text": "raw OCR extracted text with errors and formatting issues",
  "medications": [
    {
      "name": "medication name with possible OCR errors",
      "dosage": "dosage with possible number/letter confusion",
      "frequency": "frequency info (may be unclear)",
      "duration": "duration (may be incomplete)",
      "instructions": "instructions with OCR errors"
    }
  ],
  "doctorName": "doctor name with possible errors",
  "prescriptionDate": "date if visible (may have format issues)"
}

OCR Model Behavior:
- Confuse similar characters (O/0, I/1, S/5, B/8, etc.)
- Miss spaces between words sometimes
- Break words across lines incorrectly
- Have trouble with handwritten text
- Make 10-20% character recognition errors
- Don't understand context - just recognize characters
- Sometimes miss entire words or lines
- Struggle with poor image quality areas`,
            },
            {
              inline_data: {
                mime_type: "image/png",
                data: image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7, // Higher temperature for more variation
        topK: 10,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Gemini API error:", response.status, errorText)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const result = await response.json()

    if (!result.candidates || result.candidates.length === 0) {
      throw new Error("No response from Gemini API")
    }

    const extractedText = result.candidates[0].content.parts[0].text

    // Try to parse JSON response
    try {
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsedData = JSON.parse(jsonMatch[0])

        // Validate the structure and apply heavy OCR errors
        if (parsedData.text && Array.isArray(parsedData.medications)) {
          // Apply realistic OCR errors to the extracted text
          parsedData.text = addOCRFormattingIssues(introduceRealisticOCRErrors(parsedData.text))

          // Apply heavy errors to medication names and other fields
          parsedData.medications = parsedData.medications.map((med) => ({
            name: med.name ? introduceRealisticOCRErrors(med.name) : med.name,
            dosage: med.dosage ? introduceRealisticOCRErrors(med.dosage) : med.dosage,
            frequency: med.frequency ? introduceRealisticOCRErrors(med.frequency) : med.frequency,
            duration: med.duration ? introduceRealisticOCRErrors(med.duration) : med.duration,
            instructions: med.instructions ? introduceRealisticOCRErrors(med.instructions) : med.instructions,
          }))

          // Apply errors to doctor name
          if (parsedData.doctorName) {
            parsedData.doctorName = introduceRealisticOCRErrors(parsedData.doctorName)
          }

          return NextResponse.json(parsedData)
        }
      }
    } catch (parseError) {
      console.warn("Failed to parse JSON response:", parseError)
    }

    // Fallback: return raw text with heavy OCR errors
    const fallbackText = addOCRFormattingIssues(introduceRealisticOCRErrors(extractedText))

    return NextResponse.json({
      text: fallbackText,
      medications: [],
      doctorName: "",
      prescriptionDate: "",
    })
  } catch (error) {
    console.error("Error extracting text:", error)
    return NextResponse.json(
      {
        error: "Failed to extract text from image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
