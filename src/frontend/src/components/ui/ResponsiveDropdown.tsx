import { useState, useRef, useEffect, Fragment, ReactNode, useMemo } from "react";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

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
          } rounded-xl border border-gray-100 bg-white py-1 shadow-lg focus:outline-none max-h-60 overflow-y-auto`}
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
  filterable?: boolean;
  filterPlaceholder?: string;
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
  filterable = false,
  filterPlaceholder = "Type to filter...",
}: ResponsiveSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!filterable || !filter.trim()) return options;
    const lower = filter.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(lower));
  }, [options, filter, filterable]);

  // Focus the filter input when dropdown opens
  useEffect(() => {
    if (isOpen && filterable && filterInputRef.current) {
      // Small delay to avoid the click event stealing focus
      requestAnimationFrame(() => filterInputRef.current?.focus());
    }
  }, [isOpen, filterable]);

  // Reset filter when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setFilter("");
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setFilter("");
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
        {filterable && (
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-3 py-2">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={filterInputRef}
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={filterPlaceholder}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredOptions.length === 1) {
                    e.preventDefault();
                    handleSelect(filteredOptions[0].value);
                  }
                }}
              />
            </div>
          </div>
        )}

        <div ref={listRef} className={filterable ? "max-h-48 overflow-y-auto" : undefined}>
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              {filterable && filter ? "No matches found" : "No options available"}
            </div>
          ) : (
            filteredOptions.map((option) => (
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
        </div>
      </ResponsiveDropdown>

      {required && (
        <input type="hidden" name={name} value={value} required />
      )}
    </div>
  );
}