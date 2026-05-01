import { ChangeEvent } from "react";

interface InputFieldProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  type?: string;
}

/**
 * Reusable input field component with built-in styling
 */
export function InputField({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = "",
  type = "text",
}: InputFieldProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full rounded-xl border border-gray-300 bg-white px-5 py-3 text-base text-gray-900 placeholder-gray-500 shadow-sm transition-all duration-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-75 ${className}`.trim()}
    />
  );
}
