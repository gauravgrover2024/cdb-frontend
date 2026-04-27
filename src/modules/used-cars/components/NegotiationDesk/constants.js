export const NEGOTIATION_STATUS = {
  PENDING: "Pending Quotations",
  NEGOTIATING: "Under Negotiation",
  AWAITING_APPROVAL: "Awaiting Approval",
  APPROVED: "Approved",
  CLOSED: "Ready for Procurement",
  LOST: "Lost / Declined",
};

export const getDefaultNegotiationValues = () => ({
  customerDemand: null,
  targetPrice: null,
  customerNegotiation: {
    priceTimeline: [], // Array of { price, timestamp }
  },
  quotations: [
    { 
      dealerName: "", 
      contactNumber: "", 
      location: "", 
      quotedPrice: null,
      sourcedBy: "",
      priceTimeline: [] // Array of { price, timestamp }
    },
  ],
  negotiationStatus: NEGOTIATION_STATUS.PENDING,
  comments: "",
});
