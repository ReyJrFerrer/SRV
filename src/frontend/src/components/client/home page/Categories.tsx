import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useServiceManagement } from "../../../hooks/serviceManagement"; // Adjust the import path as needed
import { ServiceCategory } from "../../../services/serviceCanisterService"; // Adjust the import path as needed

interface CategoriesProps {
  className?: string;
  moreButtonImageUrl: string;
  lessButtonImageUrl?: string;
}

// Maps backend names to user-friendly Filipino display names
const getCategoryDisplayName = (name: string): string => {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("electrician")) return "Electician";
  if (lowerName.includes("plumbing")) return "Plumber";
  if (lowerName.includes("massage") || lowerName.includes("massage"))
    return "Massage Services";
  if (lowerName.includes("clean")) return "Cleaning Service";
  if (lowerName.includes("auto")) return "Automotive Repair";
  if (lowerName.includes("gadget") || lowerName.includes("tech"))
    return "Gadget Repair";
  if (lowerName.includes("beauty")) return "Beauty Services";
  if (lowerName.includes("delivery")) return "Delivery Services";
  if (lowerName.includes("repair") || lowerName.includes("maintenance"))
    return "General Repair";
  if (lowerName.includes("photo")) return "Photography Services";
  if (lowerName.includes("tutor")) return "Tutoring";
  if (lowerName.includes("others")) return "Others";

  return name;
};

// This function maps a category name to a specific image URL.
const getImageUrlForCategory = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("home") || lowerName.includes("house"))
    return "/images/categories/home-services.svg";
  if (lowerName.includes("clean"))
    return "/images/categories/cleaning-services.svg";
  if (lowerName.includes("auto") || lowerName.includes("car"))
    return "/images/categories/automobile-repairs.svg";
  if (lowerName.includes("gadget") || lowerName.includes("tech"))
    return "/images/categories/gadget-technicians.svg";
  if (lowerName.includes("massage") || lowerName.includes("wellness"))
    return "/images/categories/beauty-wellness.svg";
  if (lowerName.includes("beauty"))
    return "/images/categories/beauty-services.svg";
  if (lowerName.includes("delivery"))
    return "/images/categories/delivery-errands.svg";
  if (lowerName.includes("electrician"))
    return "/images/categories/electrician.svg";
  if (lowerName.includes("plumbing")) return "/images/categories/plumber.svg";
  if (lowerName.includes("photo")) return "/images/categories/photographer.svg";
  if (lowerName.includes("tutor")) return "/images/categories/tutoring.svg";
  if (lowerName.includes("others")) return "/images/categories/others.svg";

  // Fallback image if no match is found
  return "/images/default-category.svg";
};

const Categories: React.FC<CategoriesProps> = React.memo(
  ({ className = "", moreButtonImageUrl, lessButtonImageUrl }) => {
    const navigate = useNavigate();
    const { categories, loadingCategories, error } = useServiceManagement();
    const [mobileExpanded, setMobileExpanded] = useState(false);

    // Responsive: determine how many categories to show in main row based on screen size
    const [mainRowCount, setMainRowCount] = useState(3);
    React.useEffect(() => {
      function updateMainRowCount() {
        if (window.innerWidth < 768) {
          setMainRowCount(3); // mobile: 3 + More
        } else if (window.innerWidth < 1024) {
          setMainRowCount(5); // tablet: 5 + More
        } else {
          setMainRowCount(7); // desktop: 7 + More
        }
      }
      updateMainRowCount();
      window.addEventListener("resize", updateMainRowCount);
      return () => window.removeEventListener("resize", updateMainRowCount);
    }, []);

    const isDesktop =
      typeof window !== "undefined" && window.innerWidth >= 1024;
    const shouldShowMoreButton = !isDesktop && categories.length > mainRowCount;
    // Reorder categories according to the specified order
    const categoryOrder = [
      "General Repair",
      "Cleaning Service",
      "Gadget Repair",
      "Automotive Repair",
      "Beauty Services",
      "Massage Services",
      "Tutoring",
      "Delivery Services",
      "Photography Services",
    ];

    const orderedCategories = useMemo(() => {
      // Map display names to categories
      const displayNameMap = new Map();
      categories.forEach((cat) => {
        displayNameMap.set(getCategoryDisplayName(cat.name), cat);
      });
      // Build ordered list
      const ordered = categoryOrder
        .map((name) => displayNameMap.get(name))
        .filter(Boolean);
      // Add any categories not in the order list at the end
      const remaining = categories.filter(
        (cat) => !categoryOrder.includes(getCategoryDisplayName(cat.name)),
      );
      return [...ordered, ...remaining];
    }, [categories]);

    const mainRowCategories = isDesktop
      ? orderedCategories
      : orderedCategories.slice(0, mainRowCount);
    const extraCategories = isDesktop
      ? []
      : orderedCategories.slice(mainRowCount);

    // Memoize callback functions
    const handleCategoryClick = useCallback(
      (slug: string) => {
        navigate(`/client/categories/${slug}`);
      },
      [navigate],
    );

    const toggleMobileExpanded = useCallback(() => {
      setMobileExpanded((prev) => !prev);
    }, []);

    // Memoize static classes and data
    const itemBaseClass = useMemo(
      () =>
        "flex-shrink-0 flex flex-col items-center text-center p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 w-28",
      [],
    );

    const imageSize = 50; // Fixed size for category images
    const textClass = useMemo(
      () =>
        "text-xs md:text-lg font-semibold text-gray-700 h-15 items-center text-center transition-all duration-150",
      [],
    );

    if (loadingCategories) {
      return (
        <div className={`p-4 ${className}`}>
          <h2 className="mb-4 h-7 w-1/3 animate-pulse rounded-md bg-gray-200 text-xl font-bold"></h2>
          <div className="grid grid-cols-4 gap-2 md:hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex flex-col items-center space-y-2">
                <div className="h-[60px] w-[60px] animate-pulse rounded-lg bg-gray-200"></div>
                <div className="h-4 w-16 animate-pulse rounded-md bg-gray-200"></div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={`p-4 ${className}`}>
          <h2 className="mb-4 text-xl font-bold">Mga Kategorya</h2>
          <p className="text-red-500">Error loading categories: {error}</p>
        </div>
      );
    }

    return (
      <div
        data-tour="client-categories"
        className={`${className} mx-auto flex w-full max-w-screen-lg flex-col items-center`}
      >
        <div className="mb-4 w-full">
          {/* Categories label removed; now handled by parent */}
        </div>
        {/* Main row: N categories (all for desktop, responsive for others) + More button if needed */}
        <div className="flex w-full justify-center gap-x-0 sm:gap-x-0 md:gap-x-1">
          {mainRowCategories.map((category: ServiceCategory) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.slug)}
              className={
                itemBaseClass +
                ` group min-w-0 hover:scale-105 hover:text-blue-700 ${mainRowCount === 3 ? "min-w-0 flex-1" : mainRowCount === 5 ? "w-1/6" : "min-w-0 flex-1"}`
              }
            >
              <span className="flex flex-col items-center transition-all duration-200 group-hover:scale-110 group-hover:text-blue-700">
                <img
                  src={getImageUrlForCategory(category.name)}
                  alt={category.name}
                  width={imageSize}
                  height={imageSize}
                  className="mb-2 object-cover transition-transform duration-200 ease-in-out"
                />
                <span
                  className={
                    textClass + " w-full truncate group-hover:text-blue-700"
                  }
                >
                  {(() => {
                    const label = getCategoryDisplayName(category.name);
                    const words = label.split(" ");
                    if (words.length === 1) return label;
                    return (
                      <>
                        {words[0]}
                        <br />
                        {words.slice(1).join(" ")}
                      </>
                    );
                  })()}
                </span>
              </span>
            </button>
          ))}
          {shouldShowMoreButton && (
            <button
              onClick={toggleMobileExpanded}
              className={
                itemBaseClass +
                ` group min-w-0 hover:scale-105 hover:text-blue-700 ${mainRowCount === 3 ? "min-w-0 flex-1" : mainRowCount === 5 ? "w-1/6" : "min-w-0 flex-1"}`
              }
            >
              <span className="flex flex-col items-center transition-all duration-200 group-hover:scale-110 group-hover:text-blue-700">
                <img
                  src={
                    mobileExpanded
                      ? lessButtonImageUrl || moreButtonImageUrl
                      : moreButtonImageUrl
                  }
                  alt={mobileExpanded ? "Less Categories" : "More Categories"}
                  width={imageSize}
                  height={imageSize}
                  className={`mb-2 object-cover transition-transform duration-200 ease-in-out ${mobileExpanded ? "rotate-180 transform" : ""}`}
                />
                <span
                  className={
                    textClass +
                    "w-full items-center truncate group-hover:text-blue-700"
                  }
                >
                  {mobileExpanded ? "Show Less" : "More"}
                </span>
              </span>
            </button>
          )}
        </div>
        {/* Dropdown row for extra categories (not for desktop) */}
        {shouldShowMoreButton &&
          mobileExpanded &&
          extraCategories.length > 0 &&
          !isDesktop && (
            <div
              className={`animate-fade-in-down mt-2 grid w-full justify-center gap-x-0 sm:gap-x-0.5 md:gap-x-1 ${mainRowCount === 3 ? "grid-cols-4" : mainRowCount === 5 ? "grid-cols-4 md:grid-cols-6" : "grid-cols-4 md:grid-cols-8"}`}
            >
              {extraCategories.map((category: ServiceCategory) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.slug)}
                  className={
                    itemBaseClass +
                    ` group min-w-0 hover:scale-105 hover:text-blue-700 ${mainRowCount === 3 ? "min-w-0 flex-1" : mainRowCount === 5 ? "w-1/6" : "min-w-0 flex-1"}`
                  }
                >
                  <span className="flex flex-col items-center transition-all duration-200 group-hover:scale-110 group-hover:text-blue-700">
                    <img
                      src={getImageUrlForCategory(category.name)}
                      alt={category.name}
                      width={imageSize}
                      height={imageSize}
                      className="mb-2 object-cover transition-transform duration-200 ease-in-out"
                    />
                    <span
                      className={
                        textClass + " w-full truncate group-hover:text-blue-700"
                      }
                    >
                      {(() => {
                        const label = getCategoryDisplayName(category.name);
                        const words = label.split(" ");
                        if (words.length === 1) return label;
                        return (
                          <>
                            {words[0]}
                            <br />
                            {words.slice(1).join(" ")}
                          </>
                        );
                      })()}
                    </span>
                  </span>
                </button>
              ))}
              {/* Static tile in the extra list to request a new category */}
              {/* <a
                key="request-category-extra"
                href="https://forms.gle/o3KjDDCkcr5KGE2R8"
                target="_blank"
                rel="noopener noreferrer"
                className={
                  itemBaseClass +
                  " group w-full min-w-0 hover:scale-105 hover:text-blue-700"
                }
              >
                <span className="flex flex-col items-center transition-all duration-200 group-hover:scale-110 group-hover:text-blue-700">
                  <img
                    src="/images/categories/add.svg"
                    alt="Request Category"
                    width={imageSize}
                    height={imageSize}
                    className="mb-2 object-cover transition-transform duration-200 ease-in-out"
                  />
                  <span
                    className={
                      textClass + " w-full truncate group-hover:text-blue-700"
                    }
                  >
                    Request
                    <br />
                    Category
                  </span>
                </span>
              </a> */}
            </div>
          )}
      </div>
    );
  },
);

Categories.displayName = "Categories";

export default Categories;
