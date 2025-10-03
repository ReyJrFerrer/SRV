import React from "react";
import { JoinWaitlistButton } from "../shared/JoinWaitlistButton";

interface CommunityCTASectionProps {
  onOpenCommunity: () => void;
  variant?: "blue" | "dark";
  className?: string;
}

// Reusable bottom page CTA encouraging users to open the JoinCommunityModal
// Keeps styling decoupled so modal can still be triggered from footer button.
export const CommunityCTASection: React.FC<CommunityCTASectionProps> = ({
  onOpenCommunity,
  variant = "blue",
  className = "",
}) => {
  return (
    <section className={`about-cta-section ${className}`.trim()}>
      <div
        className="about-cta-card"
        style={
          variant === "dark"
            ? {
                background: "linear-gradient(135deg,#1e293b,#0f172a)",
                border: "1px solid rgba(255,255,255,0.08)",
              }
            : undefined
        }
      >
        <div className="about-cta-illustration" aria-hidden="true">
          <img
            src="/images/srv characters (SVG)/tutor.svg"
            alt="Tutor illustration"
            className="about-cta-illustration-img"
            loading="lazy"
          />
        </div>
        <h2 className="about-cta-title">Join the SRV Community Today</h2>
        <p className="about-cta-description">
          Be part of the early group shaping a smarter way to discover and book
          trusted local services in Baguio City. Support providers. Empower
          communities. Help us build a platform that truly <strong>SRVs</strong>
          .
        </p>
        <div className="about-cta-button-container">
          <JoinWaitlistButton
            onClick={onOpenCommunity}
            loading={false}
            className="px-[2.2rem] py-[0.9rem] text-[1.05rem] font-bold"
          />
        </div>
      </div>
    </section>
  );
};

export default CommunityCTASection;
