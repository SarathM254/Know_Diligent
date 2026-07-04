import { PDFParse } from 'pdf-parse';

export const parseSBIStatement = async (fileBuffer) => {
  const parser = new PDFParse({ data: fileBuffer });
  try {
    const data = await parser.getText({});
    console.log("Success text length:", data.text.length);
  } finally {
    await parser.destroy();
  }
};
