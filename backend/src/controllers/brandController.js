import Brand from '../models/Brand.js';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

export const getBrands = async (req, res) => {
  try {
    // Populates the category details automatically so we can see the category name
    const brands = await Brand.find({}).populate('categoryId', 'name').sort({ createdAt: 1 }).lean();
    return res.status(200).json(brands);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const upsertBrand = async (req, res) => {
  try {
    const { id, name, code, categoryId, wholesalePrice, retailPrice, inventoryCount } = req.body;
    
    const updateData = { 
      name, 
      code: code ? code.toUpperCase().trim() : undefined, 
      categoryId, 
      wholesalePrice: wholesalePrice !== undefined ? Number(wholesalePrice) : undefined, 
      retailPrice: retailPrice !== undefined ? Number(retailPrice) : undefined,
      inventoryCount: inventoryCount !== undefined ? Math.round(Number(inventoryCount) * 100) / 100 : undefined
    };

    // Remove undefined properties so we don't accidentally blank out inventory on basic edits
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (id) {
      const brand = await Brand.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
      return res.status(200).json(brand);
    } else {
      // Generate a string _id from the name to satisfy the schema requirements
      updateData._id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      const newBrand = new Brand(updateData);
      await newBrand.save();
      return res.status(201).json(newBrand);
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const bulkAddInventory = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Items array required for bulk add." });
    }

    const updatedBrands = [];
    for (const item of items) {
      if (!item.brandId || !item.quantity) continue;
      const brand = await Brand.findByIdAndUpdate(
        item.brandId,
        { $inc: { inventoryCount: Math.round(Number(item.quantity) * 100) / 100 } },
        { new: true }
      );
      if (brand) updatedBrands.push(brand);
    }

    return res.status(200).json({ message: "Inventory successfully updated", updatedBrands });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const parseInvoiceWithAI = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No invoice file uploaded." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const brands = await Brand.find({}).select('_id name').lean();

    const brandListStr = brands.map(b => `{ "id": "${b._id}", "name": "${b.name}" }`).join(',\n');

    const promptText = `
You are an expert data extraction AI. Read the attached invoice document and extract all product items and their received quantities.
We have a specific database of active brands. Your job is to match the item names on the invoice to the closest existing brand in our database.

Here are the VALID database brands:
[
\${brandListStr}
]

CRITICAL MAPPING DICTIONARY:
The invoice names are often cryptic. Use this dictionary to map them intelligently to our valid database names. Invoice names might vary slightly, so apply fuzzy logic based on these examples:

*American Club / Wills / Navycut*
- "AM CLUB C FRTY" -> Club
- "AMERICAN CLUB CLOVE" -> Clove
- "AMERICAN CLUB SMASH" -> Smash
- "AMERICAN CLUB FRESH" -> Club(Fresh)
- "AMERICAN CLUB FRUITY LONGS" -> Club(longs)
- "FLAKE PREM" -> Wills Flake
- "DUKE SPECIAL" -> Duke
- "NC DLX" -> Navycut

*Gold Flake Kings & Filters*
- "GFK RED" -> King Red
- "GFK BLUE" -> King Blue
- "GOLD FL FT" -> GF Filter
- "GOLD FLAKE DLX" -> GF Deluxe
- "GF INDIE MINT" -> Indi Mint
- "GFK MIXPOD" -> Mixpod
- "GFLAKE CENTURY" -> Century
- "GF NEO SMART" -> Twinpod

*Gold Flake Slims / Sleek*
- "GOLD FLAKE SLK BLUE" -> Slk(Blue)
- "GOLD FLAKE SLK RED" -> Slk(Red)
- "GOLDFLAKE FK SOCIAL 2-POD" -> Two Pod
- "GOLDFLAKE FK SOCIAL RED" -> Social Red
- "GOLDFLAKE SLK 16CP" -> Sleek

*Classic Series*
- "CLASSIC BT" -> Milds
- "CLASSIC ICE BURST" -> Ice
- "CLASSIC DOUBLE BURST" -> Double Burst
- "CLASSIC CONNECT" -> Connect
- "CLASSIC REFR TASTE" -> Refresh
- "CLVERVE" -> Verve

*20s Packs vs 10s Packs*
If the invoice says '20RC' or '20FS' or '20BE', it's a 20s pack. Use the (20) variant ONLY IF it exists in the valid database list (e.g., 'Milds(20)'). NOTE: Some brands like 'Connect' do NOT have a (20) variant in the valid list. For those, if the invoice says 'Connect 20BE', just map it directly to 'Connect' without adding (20).
- "B&H GOLD" -> B&H
- "IKINGS" -> India King

*Others / Rare*
- "BERKELEY" -> Berkeley
- "FL LIBERTY" -> Liberty
- "PLAYER'S FRUITY COOL" -> Players Fruit
- "WAVE COOL MINT" -> Wave Cool
- "WAVE FRUIT MINT" -> Wave Fruit

RULES:
1. ONLY return a JSON object containing "items" and "remarks".
2. If an item on the invoice feels unfamiliar or doesn't match our valid database list, DO NOT include it in the "items" array. Instead, mention it as a sentence in the "remarks" field (e.g. "Skipped unfamiliar item: [Name]").
3. For each extracted item, find the closest matching name from the VALID database brands list based on the dictionary.
4. "quantity" must be a number.
5. EXTREME CARE WITH ROW ALIGNMENT: The invoice is a table. Some brand names span multiple lines or are closely packed. You MUST perfectly trace horizontally from the brand name to its correct quantity on the same exact row. Do not mistakenly take the quantity from the brand above or below it!

Example Output:
{
  "items": [
    { "brandId": "the-exact-id-from-list", "brandName": "King Red", "quantity": 10 }
  ],
  "remarks": "Skipped unfamiliar item: NEW TEST BRAND 10s"
}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        inlineData: {
                            data: req.file.buffer.toString("base64"),
                            mimeType: req.file.mimetype
                        }
                    },
                    {
                        text: promptText
                    }
                ]
            }
        ],
        config: {
            responseMimeType: "application/json"
        }
    });

    let jsonString = response.text || "{ \"items\": [] }";
    jsonString = jsonString.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let parsedData = [];
    try {
      parsedData = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error("AI returned invalid JSON:", jsonString);
      return res.status(500).json({ error: "AI failed to format output as JSON." });
    }

    // STRICT BACKEND VERIFICATION: 
    // AI might hallucinate fake brands or mess up the brandId.
    // We will loop through its extracted items and strictly match them against our real database.
    let validItems = [];
    if (parsedData.items && Array.isArray(parsedData.items)) {
      for (const item of parsedData.items) {
        // Find the actual real brand in our database array by name
        const realBrand = brands.find(b => b.name === item.brandName);
        if (realBrand) {
          // Force inject the correct brandId from the DB to completely stop missing-id bugs
          validItems.push({
            brandId: realBrand._id.toString(),
            brandName: realBrand.name,
            quantity: Number(item.quantity) || 0
          });
        } else {
          // If the AI made up a brand that isn't in our DB, drop it and add a remark
          const currentRemarks = parsedData.remarks || "";
          parsedData.remarks = currentRemarks + `\n(Backend Skipped): ${item.brandName}`;
        }
      }
    }
    parsedData.items = validItems; // Override AI's array with our strictly verified array

    return res.status(200).json(parsedData);
  } catch (error) {
    console.error("AI Parsing Error:", error);
    try { fs.writeFileSync('last_ai_error.log', String(error.stack || error)); } catch (e) {}
    return res.status(500).json({ error: error.message || "Failed to process invoice via AI." });
  }
};
