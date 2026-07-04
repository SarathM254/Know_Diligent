import pdf from './pdfWrapper.cjs';

/**
 * Parses an SBI PDF bank statement and extracts credit transaction details (UTR, amount, date).
 * @param {Buffer} fileBuffer - The PDF file as a buffer.
 * @returns {Promise<Array<{utr: string, amount: number, date: Date, rawLine: string}>>}
 */
export const parseSBIStatement = async (fileBuffer) => {
  try {
    const data = await pdf(fileBuffer);
    // Replace all newlines with a single space to merge wrapped text (handles split UTRs)
    const fullText = data.text.replace(/\n/g, ' ');
    
    // Dynamically extract the branch code from the IFS Code in the header
    // e.g. "IFS Code : SBIN0000892" -> extracts "892"
    let branchCode = '892'; // fallback
    const branchMatch = fullText.match(/IFS Code\s*:\s*[A-Z]{4}0+(\d+)/i);
    if (branchMatch) {
      branchCode = branchMatch[1];
    }
    
    const transactions = [];
    
    // Look for UPI credit transactions. UTR might contain spaces because of newline wrapping
    const upiRegex = /UPI\/CR\/(\d(?:[\s]*\d){11})/g;
    let match;
    
    while ((match = upiRegex.exec(fullText)) !== null) {
      const rawUtr = match[1];
      const utr = rawUtr.replace(/\s/g, ''); // Clean spaces from UTR
      
      // Grab a window of text following the UTR
      const afterUtr = fullText.substring(match.index + 12);
      
      // Bound the tail to the next date to prevent bleeding into the next transaction row
      // Using strict dd/mm/yyyy format to prevent accidentally matching balance decimals like "40 15/06"
      const nextDateMatch = afterUtr.match(/\d{2}\/\d{2}\/\d{4}/);
      const transactionTail = nextDateMatch ? afterUtr.substring(0, nextDateMatch.index) : afterUtr.substring(0, 250);
      
      // Find all decimal numbers in the tail
      const numberRegex = /[\d,]+\.\d{2}/g;
      const tailNumbers = transactionTail.match(numberRegex);
      
      if (tailNumbers && tailNumbers.length >= 2) {
        // In the glued format, the second-to-last number is the [BranchCode][CreditAmount] block
        let gluedAmountStr = tailNumbers[tailNumbers.length - 2].replace(/,/g, '');
        
        // Detach the branch code from the glued amount
        let creditAmountStr = gluedAmountStr;
        if (creditAmountStr.startsWith(branchCode)) {
          creditAmountStr = creditAmountStr.substring(branchCode.length);
        }
        
        const creditAmount = parseFloat(creditAmountStr);
        
        if (!isNaN(creditAmount) && creditAmount > 0) {
          // Extract the date by looking backward from the UTR match index
          const textBefore = fullText.substring(0, match.index);
          const dateRegex = /\d{2}[-\/\s](?:[A-Za-z]{3}|\d{2})[-\/\s]\d{2,4}/g;
          const dateMatches = [...textBefore.matchAll(dateRegex)];
          
          let txDate = "Unknown Date";
          if (dateMatches.length > 0) {
            txDate = dateMatches[dateMatches.length - 1][0];
          } else {
            txDate = new Date().toLocaleDateString('en-GB'); // Fallback to current date formatted as dd/mm/yyyy
          }

          transactions.push({
            utr,
            amount: creditAmount,
            date: txDate,
            rawLine: transactionTail.substring(0, 50) + "..."
          });
        } else {
          console.log(`Skipped due to 0 amount: UTR ${utr}, creditAmount: ${creditAmount}, tailNumbers: ${JSON.stringify(tailNumbers)}`);
        }
      } else {
         console.log(`Skipped due to tail numbers length < 2: UTR ${utr}, tailNumbers: ${JSON.stringify(tailNumbers)}, tail: "${transactionTail}"`);
      }
    }

    return transactions;
  } catch (error) {
    console.error('PDF parsing error details:', error);
    throw new Error('Failed to parse SBI statement PDF. Check file format.');
  }
};
