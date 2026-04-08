/**
 * Utilities for parsing and formatting customer data across the RMS platform.
 */

export interface ParsedAddress {
  city: string;
  street: string;
  house: string;
  apt: string;
  isDelivery: boolean;
  cleanName: string;
}

/**
 * Parses a combined customer name string (legacy/PB format) into structured address data.
 * Format: "Name (Доставка: City, Street House, apt. Apt)"
 */
export const parseCustomerData = (fullName: string): ParsedAddress => {
  const result: ParsedAddress = {
    city: 'Хайфа',
    street: '',
    house: '',
    apt: '',
    isDelivery: false,
    cleanName: fullName,
  };

  if (fullName.includes("(Доставка:")) {
    const parts = fullName.split("(Доставка:");
    result.cleanName = parts[0].trim();
    result.isDelivery = true;
    
    const fullAddress = (parts[1] || "").replace(")", "").trim();
    let restAddress = fullAddress;
    
    const cities = ["Хайфа", "Нешер", "Тират Кармель", "Крайот"];
    for (const c of cities) {
      if (fullAddress.startsWith(c)) {
        result.city = c;
        restAddress = fullAddress.replace(c, "").replace(/^,?\s*/, "").trim();
        break;
      }
    }
    
    if (restAddress.includes(", apt. ")) {
      const aptParts = restAddress.split(", apt. ");
      result.apt = aptParts.pop() || "";
      restAddress = aptParts.join(", apt. ").trim();
    } else if (restAddress.includes(", кв. ")) {
      const aptParts = restAddress.split(", кв. ");
      result.apt = aptParts.pop() || "";
      restAddress = aptParts.join(", кв. ").trim();
    }
    
    const words = restAddress.split(" ");
    if (words.length > 1) {
      result.house = words.pop() || "";
      result.street = words.join(" ").trim();
    } else {
      result.street = restAddress;
    }
  }

  return result;
};

/**
 * Formats structured address data back into a display string for customerName.
 */
export const formatCustomerName = (name: string, address: Partial<ParsedAddress>): string => {
  if (!address.isDelivery) return name.trim();
  
  const joinedAddress = `${address.street?.trim()} ${address.house?.trim()}${address.apt?.trim() ? ', apt. ' + address.apt.trim() : ''}`.trim();
  const finalAddress = `${address.city}${joinedAddress ? ', ' + joinedAddress : ''}`;
  
  return `${name.trim()} (Доставка: ${finalAddress})`;
};
