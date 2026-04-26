import Sidebar from '../../components/Sidebar';
import HomeAnnouncements from './components/HomeAnnouncements';
import HomeHeader from './components/HomeHeader';
import HomeLeftColumn from './components/HomeLeftColumn';
import HomeRightColumn from './components/HomeRightColumn';
import { getGreeting } from './homeUtils';
import { useHomeDashboard } from './useHomeDashboard';
import './Home.css';

const Home = () => {
  const {
    activityItems,
    dismissAnnouncement,
    isNewUser,
    metrics,
    metricsLoaded,
    resumeItems,
    resumeLoaded,
    studentFirstName,
    tip,
    toggleWeekEvent,
    visibleAnnouncements,
    weekDone,
    weekEvents,
    weekTotal,
  } = useHomeDashboard();

  return (
    <div className="home-page">
      <Sidebar />
      <main className="page-content">
        <div className="home-container">
          <HomeHeader greeting={getGreeting()} studentFirstName={studentFirstName} />

          <HomeAnnouncements
            announcements={visibleAnnouncements}
            onDismiss={dismissAnnouncement}
          />

          <div className="home-grid">
            <HomeLeftColumn
              isNewUser={isNewUser}
              metrics={metrics}
              metricsLoaded={metricsLoaded}
              onToggleWeekEvent={toggleWeekEvent}
              resumeItems={resumeItems}
              resumeLoaded={resumeLoaded}
              weekDone={weekDone}
              weekEvents={weekEvents}
              weekTotal={weekTotal}
            />

            <HomeRightColumn
              activityItems={activityItems}
              metricsLoaded={metricsLoaded}
              resumeLoaded={resumeLoaded}
              streak={metrics.streak}
              tip={tip}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;