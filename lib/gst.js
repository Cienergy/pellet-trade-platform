/**
 * GST rules (Phase-1 assumptions)
 * - Same state → CGST + SGST
 * - Different state → IGST
 * - Rate passed explicitly (no HSN lookup yet)
 */

export function calculateGST({
    subtotal,
    buyerState,
    sellerState,
    gstRate
  }) {
    if (!subtotal || subtotal <= 0) {
      throw new Error("Invalid subtotal for GST calculation");
    }
  
    const isInterState = buyerState !== sellerState;
  
    if (isInterState) {
      const gstAmount = (subtotal * gstRate) / 100;
      return {
        gstType: "IGST",
        gstRate,
        gstAmount,
        totalAmount: subtotal + gstAmount
      };
    }
  
    const halfRate = gstRate / 2;
    const gstAmount = (subtotal * gstRate) / 100;
  
    return {
      gstType: "CGST_SGST",
      gstRate,
      gstAmount,
      cgst: (subtotal * halfRate) / 100,
      sgst: (subtotal * halfRate) / 100,
      totalAmount: subtotal + gstAmount
    };
  }
  