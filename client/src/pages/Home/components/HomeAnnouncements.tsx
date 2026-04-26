import { Megaphone, X } from 'lucide-react';
import { Announcement } from '../homeTypes';

interface HomeAnnouncementsProps {
  announcements: Announcement[];
  onDismiss: (announcementId: number) => void;
}

const HomeAnnouncements = ({ announcements, onDismiss }: HomeAnnouncementsProps) => {
  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="home-announcements">
      {announcements.map((announcement) => {
        const mentorName = (announcement.mentor?.student?.name ?? 'Mentor').replace(/^PROF\.\s*/i, '');

        return (
          <div key={announcement.id} className="home-announcement-banner">
            <Megaphone size={16} className="home-announcement-icon" />
            <div className="home-announcement-content">
              <span className="home-announcement-from">{mentorName}</span>
              <p>{announcement.content}</p>
            </div>
            <button
              type="button"
              className="home-announcement-dismiss"
              onClick={() => onDismiss(announcement.id)}
              title="Dispensar"
              aria-label="Dispensar aviso"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default HomeAnnouncements;
