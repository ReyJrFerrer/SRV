import React, { useState, useRef, useEffect } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  className = "",
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const lastCompletedValue = useRef<string>("");

  // Initialize the refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Focus management
  useEffect(() => {
    if (inputRefs.current[focusedIndex]) {
      inputRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  // Call onComplete when all digits are entered (only once per value)
  useEffect(() => {
    if (
      value.length === length &&
      onComplete &&
      value !== lastCompletedValue.current
    ) {
      lastCompletedValue.current = value;
      onComplete(value);
    } else if (value.length < length) {
      // Reset when value changes to incomplete
      lastCompletedValue.current = "";
    }
  }, [value, length, onComplete]);

  const handleChange = (index: number, digit: string) => {
    // Only allow numeric input
    if (digit && !/^\d$/.test(digit)) {
      return;
    }

    const newValue = value.split("");
    newValue[index] = digit;
    const updatedValue = newValue.join("").slice(0, length);

    onChange(updatedValue);

    // Move to next input if digit was entered
    if (digit && index < length - 1) {
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      if (!value[index] && index > 0) {
        // Move to previous input if current is empty
        setFocusedIndex(index - 1);
      } else {
        // Clear current input
        const newValue = value.split("");
        newValue[index] = "";
        onChange(newValue.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      setFocusedIndex(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      setFocusedIndex(index + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    onChange(pastedData);

    // Focus the next empty input or the last input
    const nextIndex = Math.min(pastedData.length, length - 1);
    setFocusedIndex(nextIndex);
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  return (
    <div className={`flex justify-center gap-2 ${className}`}>
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={() => handleFocus(index)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`h-12 w-12 rounded-lg border-2 text-center text-lg font-semibold transition-all duration-200 focus:outline-none ${
            error
              ? "border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 bg-white text-gray-900 focus:border-blue-500 focus:ring-blue-500"
          } ${disabled ? "cursor-not-allowed bg-gray-100 text-gray-400" : ""} ${
            focusedIndex === index && !disabled ? "ring-2" : ""
          }`}
          autoComplete="one-time-code"
        />
      ))}
    </div>
  );
};

export default OtpInput;
