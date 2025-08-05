// Basic utilities for CBRT
export const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString();
};

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const capitalize = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case "active":
      return "bg-green-100 text-green-800";
    case "inactive":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const generateBarcode = (bargeName, lotNumber, customerName, itemCode, sizeName) => {
  const parts = [bargeName || "", lotNumber || "", customerName || "", itemCode || "", sizeName || ""];
  return parts.join("").replace(/\s/g, "");
};
