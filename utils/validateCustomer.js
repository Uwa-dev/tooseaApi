  export const validateCustomer = (customer) => {
    if (!customer?.fullName) {
      throw new Error("Customer full name is required");
    }

    const hasEmail = customer.email && customer.email.trim() !== "";
    const hasPhone = customer.phone && customer.phone.trim() !== "";

    if (!hasEmail && !hasPhone) {
      throw new Error("Either email or phone is required");
    }
  };

  export const normalizePhone = (phone) => {
    if (!phone) return null;

    let cleaned = phone.replace(/\s+/g, "");

    // 08012345678 → +2348012345678
    if (cleaned.startsWith("0")) {
      cleaned = "+234" + cleaned.substring(1);
    }

    // 2348012345678 → +2348012345678
    if (cleaned.startsWith("234")) {
      cleaned = "+" + cleaned;
    }

    return cleaned;
  };