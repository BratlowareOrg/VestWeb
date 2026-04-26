import { memo, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Play, X, Heart, Check, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import { fetchVideos, toggleFavorite, updateProgress, Video } from '../../slices/videosSlice';
import { AppDispatch, RootState } from '../../store/store';
import './Sinaflix.css';

function getYoutubeEmbedUrl(url: string): string {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\n?#]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : url;
}

function getYoutubeThumbnail(url: string): string {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\n?#]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : '';
}

type VideoCardProps = {
  video: Video;
  onSelect: (video: Video) => void;
  onToggleFavorite: (e: React.MouseEvent, id: number) => void;
};

const VideoCard = memo(function VideoCard({ video, onSelect, onToggleFavorite }: VideoCardProps) {
  const thumb = video.thumbnail_url || getYoutubeThumbnail(video.youtube_url);
  const isWatched = video.progress?.watched;
  const hasProgress = (video.progress?.progress_seconds ?? 0) > 0;

  return (
    <div className="VestWebFlix-video-card" onClick={() => onSelect(video)}>
      <div className="VestWebFlix-video-thumb">
        {thumb && (
          <img
            src={thumb}
            alt={video.title}
            width={320}
            height={180}
            loading="lazy"
            decoding="async"
          />
        )}
        <div className="VestWebFlix-video-thumb-overlay" />
        <div className="VestWebFlix-video-thumb-icon">
          <Play size={20} style={{ marginLeft: '2px' }} />
        </div>
        {isWatched && (
          <div className="VestWebFlix-watched-badge">
            <Check size={10} />
          </div>
        )}
        <button
          className={`VestWebFlix-card-fav${video.isFavorite ? ' is-fav' : ''}`}
          onClick={e => onToggleFavorite(e, video.id)}
          aria-label={video.isFavorite ? 'Remover favorito' : 'Favoritar'}
        >
          <Heart size={13} aria-hidden="true" />
        </button>
        {(isWatched || hasProgress) && (
          <div className="VestWebFlix-progress-bar">
            <div
              className={`VestWebFlix-progress-fill${isWatched ? ' watched' : ''}`}
              style={{ width: isWatched ? '100%' : '35%' }}
            />
          </div>
        )}
      </div>
      <div className="VestWebFlix-video-info">
        <div className="VestWebFlix-video-title">{video.title}</div>
        <div className="VestWebFlix-video-topic">{video.topic?.name || video.topic?.subject?.name}</div>
      </div>
    </div>
  );
});

const VestWebFlix = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { videos, loading } = useSelector((state: RootState) => state.videos);
  const [search, setSearch] = useState('');
  const [activeSubject, setActiveSubject] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    dispatch(fetchVideos({}));
  }, [dispatch]);

  const scrollRow = useCallback((subject: string, dir: 'left' | 'right') => {
    const el = scrollRefs.current[subject];
    if (el) el.scrollBy({ left: dir === 'right' ? 320 : -320, behavior: 'smooth' });
  }, []);

  const subjects = useMemo(
    () => Array.from(new Set(videos.map((video) => video.topic?.subject?.name).filter(Boolean))),
    [videos]
  );

  const normalizedSearch = useMemo(() => search.trim().toLowerCase(), [search]);

  const filtered = useMemo(() => videos.filter((video) => {
    const matchSearch = !normalizedSearch || video.title.toLowerCase().includes(normalizedSearch);
    const matchSubject = activeSubject === 'all' || video.topic?.subject?.name === activeSubject;
    return matchSearch && matchSubject;
  }), [videos, normalizedSearch, activeSubject]);

  const groupedBySubject = useMemo(() => {
    const grouped: Record<string, Video[]> = {};

    filtered.forEach((video) => {
      const key = video.topic?.subject?.name || 'Outros';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(video);
    });

    return grouped;
  }, [filtered]);

  const groupedRows = useMemo(() => Object.entries(groupedBySubject), [groupedBySubject]);

  const handleToggleFavorite = useCallback((e: React.MouseEvent, videoId: number) => {
    e.stopPropagation();
    dispatch(toggleFavorite(videoId));
  }, [dispatch]);

  const handleMarkWatched = useCallback(() => {
    if (!selectedVideo) return;
    dispatch(updateProgress({ id: selectedVideo.id, watched: true }));
  }, [dispatch, selectedVideo]);

  return (
    <div className="VestWebFlix">
      <Sidebar />
      <div className="VestWebFlix-content">
        <div className="VestWebFlix-header">
          <h1>VestWebFlix</h1>
          <div className="VestWebFlix-search">
            <Search size={16} className="VestWebFlix-search-icon" />
            <input
              type="text"
              placeholder="Buscar videoaulas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="VestWebFlix-tabs">
          <button
            className={`VestWebFlix-tab${activeSubject === 'all' ? ' active' : ''}`}
            onClick={() => setActiveSubject('all')}
          >
            Todas
          </button>
          {subjects.map(s => (
            <button
              key={s}
              className={`VestWebFlix-tab${activeSubject === s ? ' active' : ''}`}
              onClick={() => setActiveSubject(s!)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="VestWebFlix-body">
          {loading ? (
            <div className="VestWebFlix-loading">
              <div className="spinner" />
              <p>Carregando videoaulas...</p>
            </div>
          ) : Object.keys(groupedBySubject).length === 0 ? (
            <div className="VestWebFlix-loading">
              <Play size={48} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: '16px' }} />
              <p>Nenhuma videoaula encontrada</p>
            </div>
          ) : (
            groupedRows.map(([subject, vids]) => (
              <div key={subject} className="VestWebFlix-row">
                <div className="VestWebFlix-row-header">
                  <div className="VestWebFlix-row-title">{subject}</div>
                  <div className="VestWebFlix-row-nav">
                    <button
                      className="VestWebFlix-row-nav-btn"
                      onClick={() => scrollRow(subject, 'left')}
                      aria-label="Rolar para esquerda"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      className="VestWebFlix-row-nav-btn"
                      onClick={() => scrollRow(subject, 'right')}
                      aria-label="Rolar para direita"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div
                  className="VestWebFlix-videos-scroll"
                  ref={el => { scrollRefs.current[subject] = el; }}
                >
                  {vids.map(video => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      onSelect={setSelectedVideo}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {selectedVideo && (
        <div className="VestWebFlix-modal-overlay" onClick={() => setSelectedVideo(null)}>
          <div className="VestWebFlix-modal" onClick={e => e.stopPropagation()}>
            <div style={{ position: 'relative' }}>
              <div className="VestWebFlix-modal-video">
                <iframe
                  src={getYoutubeEmbedUrl(selectedVideo.youtube_url)}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <button className="VestWebFlix-modal-close" onClick={() => setSelectedVideo(null)} aria-label="Fechar vídeo">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="VestWebFlix-modal-body">
              <div className="VestWebFlix-modal-actions">
                <button className="VestWebFlix-modal-btn VestWebFlix-modal-btn-primary" onClick={handleMarkWatched}>
                  <Check size={16} />
                  Marcar como assistido
                </button>
                <button
                  className="VestWebFlix-modal-btn VestWebFlix-modal-btn-fav"
                  onClick={e => handleToggleFavorite(e, selectedVideo.id)}
                >
                  <Heart size={16} />
                  {selectedVideo.isFavorite ? 'Remover favorito' : 'Favoritar'}
                </button>
                <button className="VestWebFlix-modal-btn VestWebFlix-modal-btn-secondary" onClick={() => setSelectedVideo(null)}>
                  <X size={16} />
                  Fechar
                </button>
              </div>
              <h2 className="VestWebFlix-modal-title">{selectedVideo.title}</h2>
              <div className="VestWebFlix-modal-meta">
                {selectedVideo.topic?.subject?.name && <span>{selectedVideo.topic.subject.name} · </span>}
                {selectedVideo.topic?.name && <span>{selectedVideo.topic.name}</span>}
              </div>
              {selectedVideo.description && (
                <p className="VestWebFlix-modal-desc">{selectedVideo.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VestWebFlix;
