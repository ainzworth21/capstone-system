import Link from "next/link";
import { NeedsAttentionItem } from "@/lib/admin-stats";

function Section({
  title,
  count,
  items,
  emptyLabel,
  linkFor,
}: {
  title: string;
  count: number;
  items: NeedsAttentionItem[];
  emptyLabel: string;
  linkFor: (item: NeedsAttentionItem) => string;
}) {
  return (
    <div className="needs-section">
      <div className="needs-section-title">
        {title} <span className="needs-count">[{count}]</span>
      </div>
      {items.length === 0 ? (
        <div className="needs-empty">{emptyLabel}</div>
      ) : (
        <ul className="needs-list">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={linkFor(item)} className="needs-link">
                {item.title}
                {item.regs > 0 && (
                  <span className="needs-regs"> ({item.regs} regs)</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NeedsAttentionPanel({
  surveyOnNoQuestions,
  regsSurveyOff,
  quizOnNoQuestions,
}: {
  surveyOnNoQuestions: NeedsAttentionItem[];
  regsSurveyOff: NeedsAttentionItem[];
  quizOnNoQuestions: NeedsAttentionItem[];
}) {
  return (
    <aside className="needs-panel card">
      <div className="card-header">
        <h3>Needs Attention</h3>
      </div>
      <div className="card-body needs-panel-body">
        <Section
          title="Survey ON but no questions"
          count={surveyOnNoQuestions.length}
          items={surveyOnNoQuestions}
          emptyLabel="None"
          linkFor={() => "/dashboard/questions?type=survey"}
        />
        <Section
          title="Has registrations but Survey OFF"
          count={regsSurveyOff.length}
          items={regsSurveyOff.slice(0, 12)}
          emptyLabel="None"
          linkFor={(item) => `/dashboard/questions?type=survey&event_id=${item.id}`}
        />
        <Section
          title="Quiz ON but no questions"
          count={quizOnNoQuestions.length}
          items={quizOnNoQuestions.slice(0, 8)}
          emptyLabel="None"
          linkFor={(item) => `/dashboard/questions?type=quiz&event_id=${item.id}`}
        />
        {regsSurveyOff.length > 12 && (
          <Link href="/dashboard/evaluations" className="needs-more">
            View all {regsSurveyOff.length} events
          </Link>
        )}
      </div>
    </aside>
  );
}
