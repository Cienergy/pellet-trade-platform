/**
 * GST rules - Compute strictly at invoice generation using transaction value
 * - Transaction value = Quantity × Price (from batch)
 * - Auto-classify intra/inter-state supply based on buyer and seller states
 * - Calculate CGST/SGST (intra-state) or IGST (inter-state)
 * - All tax fields are immutable after invoice generation
 */

export function calculateGST({
    transactionValue, // Quantity × Price (must be provided)
    buyerState,
    sellerState,
    gstRate = 12 // Default 12% GST
  }) {
    if (!transactionValue || transactionValue <= 0) {
      throw new Error("Invalid transaction value for GST calculation. Must be Quantity × Price.");
    }
  
    if (!buyerState || !sellerState) {
      throw new Error("Buyer state and seller state are required for GST calculation");
    }
  
    const isInterState = buyerState.trim().toUpperCase() !== sellerState.trim().toUpperCase();
  
    if (isInterState) {
      // Inter-state supply: IGST
      const gstAmount = (transactionValue * gstRate) / 100;
      return {
        gstType: "IGST",
        gstRate,
        gstAmount,
        igst: gstAmount,
        cgst: null,
        sgst: null,
        totalAmount: transactionValue + gstAmount
      };
    }
  
    // Intra-state supply: CGST + SGST
    const halfRate = gstRate / 2;
    const gstAmount = (transactionValue * gstRate) / 100;
    const cgst = (transactionValue * halfRate) / 100;
    const sgst = (transactionValue * halfRate) / 100;
  
    return {
      gstType: "CGST_SGST",
      gstRate,
      gstAmount,
      cgst,
      sgst,
      igst: null,
      totalAmount: transactionValue + gstAmount
    };
  }
  