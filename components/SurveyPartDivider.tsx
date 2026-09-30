export default function SurveyPartDivider({ label }: { label: string }) {
  return (
    <div className="survey-part-divider" role="separator" aria-label={label}>
      <span className="survey-part-divider-label">{label}</span>
    </div>
  );
}
