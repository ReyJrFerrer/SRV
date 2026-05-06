import { useState, useRef, useEffect, Fragment, ReactNode } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

interface ResponsiveDropdownProps {
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  position?: "left" | "right";
  width?: string;
}

export function ResponsiveDropdown({
  triggerRef,
  isOpen,
  onClose,
  children,
  position = "left",
  width = "w-full",
}: ResponsiveDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [flipUp, setFlipUp] = useState(false);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const threshold = 250;

      if (spaceBelow < threshold && spaceAbove > spaceBelow) {
        setFlipUp(true);
      } else {
        setFlipUp(false);
      }
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  return (
    <Fragment>
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute z-50 ${width} ${
            flipUp
              ? "bottom-full mb-2"
              : "mt-2"
          } ${
            position === "right" ? "right-0" : "left-0"
          } rounded-xl border border-gray-100 bg-white py-1 shadow-lg focus:outline-none`}
        >
          {children}
        </div>
      )}
    </Fragment>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface ResponsiveSelectProps {
  name: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
}

export function ResponsiveSelect({
  name,
  id,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  error = false,
  disabled = false,
  loading = false,
  required = false,
}: ResponsiveSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        name={name}
        disabled={disabled || loading}
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm shadow-sm transition-all focus:ring-2 focus:ring-yellow-400 ${
          error
            ? "border-red-300 bg-red-50 text-red-700 focus:border-red-500"
            : "border-gray-200 bg-gray-50 text-gray-900 focus:border-yellow-400"
        } ${disabled || loading ? "cursor-not-allowed opacity-60" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {loading ? (
          <span className="text-gray-500">Loading...</span>
        ) : selectedOption ? (
          <span>{selectedOption.label}</span>
        ) : (
          <span className="text-gray-500">{placeholder}</span>
        )}
        <ChevronDownIcon
          className={`ml-2 h-5 w-5 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <ResponsiveDropdown
        triggerRef={triggerRef}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        width="w-full"
        position="left"
      >
        {options.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-500">
            No options available
          </div>
        ) : (
          options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`flex w-full items-center px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 ${
                value === option.value
                  ? "bg-yellow-50 text-yellow-700 font-medium"
                  : "text-gray-700"
              }`}
              role="option"
              aria-selected={value === option.value}
            >
              {option.label}
            </button>
          ))
        )}
      </ResponsiveDropdown>

      {required && (
        <input type="hidden" name={name} value={value} required />
      )}
    </div>
  );
}