const MAX_AMOUNT = 50000;

export const validateAmount = (value: string): string => {
  let numericValue = value.replace(/[^0-9]/g, "");
  if (numericValue.length > 1 && numericValue.startsWith("0")) {
    numericValue = parseInt(numericValue, 10).toString();
  }
  if (parseInt(numericValue, 10) > MAX_AMOUNT) {
    numericValue = MAX_AMOUNT.toString();
  }
  if (numericValue === "NaN") {
    numericValue = "";
  }
  return numericValue;
};

export const isValidAmount = (amount: number): boolean => {
  return amount > 0 && amount <= MAX_AMOUNT;
};

export const getMaxAmount = (): number => MAX_AMOUNT;

