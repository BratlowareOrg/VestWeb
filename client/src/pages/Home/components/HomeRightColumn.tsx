import { Flame, HelpCircle, Lightbulb } from 'lucide-react';
import { ActivityItem, Tip } from '../homeTypes';
import { timeAgo } from '../homeUtils';

interface HomeRightColumnProps {
  activityItems: ActivityItem[];
  metricsLoaded: boolean;
  resumeLoaded: boolean;
  streak: number;
  tip: Tip;
}

const HomeRightColumn = ({
  activityItems,
  metricsLoaded,
  resumeLoaded,
  streak,
  tip,
}: HomeRightColumnProps) => (
  <div className="home-right">
    <div className="home-activity">
      <h2 className="home-section-title">Atividade recente</h2>
      {!resumeLoaded ? (
        [...Array(3)].map((_, index) => (
          <div key={index} className="activity-item">
            <div className="sk" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="sk" style={{ width: '75%', height: 13 }} />
              <div className="sk" style={{ width: '35%', height: 11 }} />
            </div>
          </div>
        ))
      ) : activityItems.length === 0 ? (
        <div className="home-activity-empty">
          <HelpCircle size={28} />
          <p>Nenhuma atividade ainda.</p>
          <span>Resolva questoes ou assista aulas para ver seu historico.</span>
        </div>
      ) : (
        activityItems.map((activity, index) => (
          <div key={index} className="activity-item">
            <div className="activity-dot">
              <activity.icon size={16} />
            </div>
            <div className="activity-text">
              <strong>{activity.text}</strong>
              <span>{timeAgo(activity.time)}</span>
            </div>
          </div>
        ))
      )}
    </div>

    <div className="home-tip">
      <h2 className="home-section-title">
        <Lightbulb size={16} />
        Dica do dia
      </h2>
      <div className="tip-card">
        <div className="tip-subject">{tip.subject}</div>
        <p>{tip.text}</p>
      </div>

      <div className="streak-display">
        <div className="streak-fire"><Flame size={24} /></div>
        <div className="streak-info">
          {!metricsLoaded
            ? <div className="sk" style={{ width: 80, height: 20 }} />
            : <strong>{streak} dias</strong>}
          <span>de sequencia de estudos</span>
        </div>
      </div>
    </div>
  </div>
);

export default HomeRightColumn;
