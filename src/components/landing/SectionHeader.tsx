import React from "react";

interface SectionHeaderProps {
  /** Small badge above the heading. */
  eyebrow: string;
  /** First line of the heading. */
  title: React.ReactNode;
  /** Optional second line, shown muted. */
  titleMuted?: React.ReactNode;
  /** id for the <h2>, referenced by the section's aria-labelledby. */
  id: string;
  /** Subheading paragraph. */
  children?: React.ReactNode;
  /** "sm" for a header nested inside another section (e.g. the hero). */
  size?: "default" | "sm";
}

/** The one header used by every landing section: badge, two-line heading, subheading. */
const SectionHeader = ({ eyebrow, title, titleMuted, id, children, size = "default" }: SectionHeaderProps) => (
  <div className={size === "sm" ? "text-center mb-10 lg:mb-12" : "text-center mb-14 lg:mb-16"}>
    <span className="eyebrow mb-5">{eyebrow}</span>
    <h2
      id={id}
      className={
        size === "sm"
          ? "mt-5 text-3xl md:text-4xl font-semibold tracking-tight text-foreground text-balance"
          : "section-heading mt-5 text-foreground"
      }
    >
      {title}
      {titleMuted && (
        <>
          <br className="hidden sm:block" />
          <span className="text-muted-foreground"> {titleMuted}</span>
        </>
      )}
    </h2>
    {children && <p className="section-subheading mt-6">{children}</p>}
  </div>
);

export default SectionHeader;
