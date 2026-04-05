const fs = require("fs");
const path = require("path");
const svgPath =
  "/Volumes/DevSSD/Projects/SRV-WCHL/src/mobile/SRV/public/logo.svg";
const outPath =
  "/Volumes/DevSSD/Projects/SRV-WCHL/src/mobile/SRV/components/provider/LogoSvgString.ts";

const svgContent = fs.readFileSync(svgPath, "utf8");
const fileContent = `export const logoSvgString = ${JSON.stringify(svgContent)};\n`;

fs.writeFileSync(outPath, fileContent);
console.log("Created LogoSvgString.ts");
